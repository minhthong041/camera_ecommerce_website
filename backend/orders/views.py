from decimal import Decimal
from uuid import uuid4

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet

from cart.models import CartItem, ShoppingCart
from catalog.models import ProductItem
from locations.models import Address
from inventory.models import InventoryLedgerEntry
from inventory.services import (
    InventoryError,
    StockChange,
    apply_locked_stock_changes,
    restore_order_stock,
)
from payments.gateways import initialize_payment_gateway, normalize_provider_name
from payments.models import Payment, PaymentMethod, PaymentStatus
from promotions.services import PromotionLine, PromotionRuleError, quote_promotion
from admin_dashboard.permissions import IsAdminRole, IsStaffRole

from .models import (
    Order,
    OrderLine,
    OrderStatus,
    ReturnRequest,
    ReturnRequestStatus,
    ShippingMethod,
)
from .serializers import (
    CheckoutSerializer,
    OrderDetailSerializer,
    OrderSerializer,
    OrderStatusUpdateSerializer,
    ReturnRequestCreateSerializer,
    ReturnRequestSerializer,
    ReturnRequestStatusUpdateSerializer,
    ShippingMethodSerializer,
)
from .state_machine import (
    CUSTOMER_CANCELLABLE_STATUSES,
    RESTOCKED_ORDER_STATUSES,
    allowed_admin_transitions,
    is_admin_transition_allowed,
    normalize_status_name,
)


MONEY_QUANTIZER = Decimal("0.01")


def get_configured_order_status(status_name):
    order_status = OrderStatus.objects.filter(name__iexact=status_name).first()
    if order_status is None:
        raise ValidationError(
            {"status": f"Order status '{status_name}' is not configured."}
        )
    return order_status


def get_configured_return_request_status(status_name):
    return_status = ReturnRequestStatus.objects.filter(
        name__iexact=status_name
    ).first()
    if return_status is None:
        raise ValidationError(
            {
                "status": (
                    f"Return request status '{status_name}' is not configured."
                )
            }
        )
    return return_status


def sync_cod_payment_status(order, order_status_name):
    payment_status_by_order_status = {
        "cancelled": "failed",
        "delivered": "paid",
    }
    payment_status_name = payment_status_by_order_status.get(order_status_name)
    if payment_status_name is None:
        return

    cod_payment = (
        Payment.objects.select_for_update()
        .filter(
            order=order,
            payment_method__name__iexact="cod",
            status__name__iexact="pending",
        )
        .first()
    )
    if cod_payment is None:
        return

    payment_status = PaymentStatus.objects.filter(
        name__iexact=payment_status_name
    ).first()
    if payment_status is None:
        raise ValidationError(
            {
                "payment_status": (
                    f"Payment status '{payment_status_name}' is not configured."
                )
            }
        )

    cod_payment.status = payment_status
    cod_payment.save(update_fields=("status", "updated_at"))


def optimized_order_queryset():
    return (
        Order.objects.select_related(
            "user",
            "status",
            "shipping_method",
            "shipping_address",
            "promotion",
        )
        .prefetch_related("lines__product_item__product")
        .order_by("-created_at", "-id")
    )


class ShippingMethodListAPIView(generics.ListAPIView):
    queryset = ShippingMethod.objects.order_by("price", "id")
    serializer_class = ShippingMethodSerializer
    permission_classes = (AllowAny,)


def optimized_return_request_queryset():
    return ReturnRequest.objects.select_related(
        "user",
        "status",
        "order",
        "order__status",
    ).order_by("-created_at", "-id")


class ReturnRequestListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return optimized_return_request_queryset().filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ReturnRequestCreateSerializer
        return ReturnRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return_request = serializer.save()
        output_serializer = ReturnRequestSerializer(
            return_request,
            context=self.get_serializer_context(),
        )
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class AdminReturnRequestListAPIView(generics.ListAPIView):
    serializer_class = ReturnRequestSerializer
    permission_classes = (IsAuthenticated, IsAdminRole | IsStaffRole)
    queryset = optimized_return_request_queryset()


class AdminReturnRequestStatusAPIView(generics.GenericAPIView):
    serializer_class = ReturnRequestStatusUpdateSerializer
    permission_classes = (IsAuthenticated, IsAdminRole | IsStaffRole)

    def patch(self, request, pk, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        requested_status = serializer.validated_data["status"]

        with transaction.atomic():
            return_request = (
                ReturnRequest.objects.select_for_update()
                .select_related("status", "order", "order__status", "user")
                .filter(pk=pk)
                .first()
            )
            if return_request is None:
                raise NotFound("Return request does not exist.")

            if return_request.status.name.strip().lower() != "pending":
                raise ValidationError(
                    {"status": "Only pending return requests can be processed."}
                )

            new_return_status = get_configured_return_request_status(
                requested_status
            )
            if requested_status == "approved":
                self.approve_return(
                    return_request,
                    new_return_status,
                    request.user,
                )
            else:
                return_request.status = new_return_status
                return_request.save(update_fields=("status",))

        return_request = optimized_return_request_queryset().get(pk=return_request.pk)
        return Response(
            ReturnRequestSerializer(return_request).data,
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def approve_return(return_request, approved_return_status, actor):
        refunded_order_status = get_configured_order_status("refunded")
        refunded_payment_status = PaymentStatus.objects.filter(
            name__iexact="refunded"
        ).first()
        if refunded_payment_status is None:
            raise ValidationError(
                {"payment_status": "Refunded payment status is not configured."}
            )

        payment = (
            Payment.objects.select_for_update()
            .select_related("status")
            .filter(order_id=return_request.order_id)
            .filter(
                Q(status__name__iexact="paid")
                | Q(status__name__iexact="completed")
            )
            .order_by("-created_at", "-id")
            .first()
        )
        if payment is None:
            raise ValidationError(
                {"payment": "This order has no refundable payment."}
            )

        order = (
            Order.objects.select_for_update()
            .select_related("status")
            .get(pk=return_request.order_id)
        )
        if order.status.name.strip().lower() != "delivered":
            raise ValidationError(
                {"order": "Only delivered orders can be approved for return."}
            )

        try:
            restore_order_stock(
                order=order,
                reason=InventoryLedgerEntry.Reason.RETURN_APPROVED,
                actor=actor,
                note="Stock restored after return approval.",
            )
        except InventoryError as exc:
            raise ValidationError({"inventory": exc.message}) from exc

        payment.status = refunded_payment_status
        payment.save(update_fields=("status", "updated_at"))

        order.status = refunded_order_status
        order.save(update_fields=("status",))

        return_request.status = approved_return_status
        return_request.save(update_fields=("status",))


class CheckoutAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        with transaction.atomic():
            serializer = CheckoutSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            checkout_data = serializer.validated_data

            # Step 1 - Get cart and make sure it has at least one item.
            cart = ShoppingCart.objects.filter(user=request.user).first()
            if cart is None:
                raise ValidationError({"cart": "Shopping cart is empty."})

            cart_items = list(
                CartItem.objects.filter(cart=cart)
                .select_related("product_item")
                .order_by("id")
            )
            if not cart_items:
                raise ValidationError({"cart": "Shopping cart is empty."})

            # Step 2 - Lock product item rows before validating stock.
            product_item_ids = [item.product_item_id for item in cart_items]
            locked_product_items = (
                ProductItem.objects.select_for_update()
                .select_related("product")
                .filter(id__in=product_item_ids)
            )
            product_item_map = {item.id: item for item in locked_product_items}

            if len(product_item_map) != len(product_item_ids):
                raise ValidationError(
                    {"cart": "One or more product items no longer exist."}
                )

            # Step 3 - Validate active products and stock availability.
            for cart_item in cart_items:
                product_item = product_item_map[cart_item.product_item_id]

                if not product_item.product.is_active:
                    raise ValidationError(
                        {
                            "cart": (
                                f"Product '{product_item.product.name}' "
                                "is no longer available."
                            )
                        }
                    )

                if cart_item.quantity > product_item.qty_in_stock:
                    raise ValidationError(
                        {
                            "cart": (
                                f"SKU '{product_item.sku}' only has "
                                f"{product_item.qty_in_stock} item(s) in stock."
                            )
                        }
                    )

            # Step 4 - Calculate subtotal from trusted database prices.
            subtotal = sum(
                (
                    product_item_map[item.product_item_id].price * item.quantity
                    for item in cart_items
                ),
                Decimal("0.00"),
            ).quantize(MONEY_QUANTIZER)

            # Step 5 - Fetch checkout options from trusted lookup tables.
            shipping_method = ShippingMethod.objects.filter(
                pk=checkout_data["shipping_method_id"]
            ).first()
            if shipping_method is None:
                raise ValidationError(
                    {"shipping_method_id": "Shipping method does not exist."}
                )

            shipping_address = (
                Address.objects.select_related(
                    "ward",
                    "ward__district",
                    "ward__district__city",
                    "ward__district__city__province",
                    "ward__district__city__province__country",
                )
                .filter(
                    pk=checkout_data["shipping_address_id"],
                    user_addresses__user=request.user,
                )
                .first()
            )
            if shipping_address is None:
                raise ValidationError(
                    {
                        "shipping_address_id": (
                            "Shipping address does not exist or does not belong "
                            "to the current user."
                        )
                    }
                )

            payment_method = PaymentMethod.objects.filter(
                pk=checkout_data["payment_method_id"]
            ).first()
            if payment_method is None:
                raise ValidationError(
                    {"payment_method_id": "Payment method does not exist."}
                )

            provider_name = normalize_provider_name(payment_method.name)
            if provider_name not in {"cod", "vnpay", "stripe"}:
                raise ValidationError(
                    {
                        "payment_method_id": (
                            "Only COD, VNPay, and Stripe are currently supported."
                        )
                    }
                )

            shipping_fee = shipping_method.price.quantize(MONEY_QUANTIZER)

            # Step 6 - Apply promotion, if provided.
            promotion = None
            discount_amount = Decimal("0.00")
            promotion_code = checkout_data.get("promotion_code")
            if promotion_code:
                promotion_lines = tuple(
                    PromotionLine(
                        category_id=product_item_map[
                            item.product_item_id
                        ].product.category_id,
                        unit_price=product_item_map[item.product_item_id].price,
                        quantity=item.quantity,
                    )
                    for item in cart_items
                )
                try:
                    promotion_quote = quote_promotion(
                        code=promotion_code,
                        user=request.user,
                        lines=promotion_lines,
                        lock=True,
                    )
                except PromotionRuleError as exc:
                    raise ValidationError(
                        {"promotion_code": exc.message}
                    ) from exc
                promotion = promotion_quote.promotion
                discount_amount = promotion_quote.discount_amount

            total_amount = (
                subtotal + shipping_fee - discount_amount
            ).quantize(MONEY_QUANTIZER)

            # Step 7 - Create the order and its initial payment atomically.
            pending_status = OrderStatus.objects.filter(name__iexact="pending").first()
            if pending_status is None:
                raise ValidationError(
                    {"status": "Pending order status is not configured."}
                )

            initial_order_status = pending_status
            if provider_name == "cod":
                initial_order_status = OrderStatus.objects.filter(
                    name__iexact="confirmed"
                ).first()
                if initial_order_status is None:
                    raise ValidationError(
                        {"status": "Confirmed order status is not configured."}
                    )

            pending_payment_status = PaymentStatus.objects.filter(
                name__iexact="pending"
            ).first()
            if pending_payment_status is None:
                raise ValidationError(
                    {"payment_status": "Pending payment status is not configured."}
                )

            order = Order.objects.create(
                order_code=self.generate_order_code(),
                user=request.user,
                shipping_method=shipping_method,
                shipping_address=shipping_address,
                promotion=promotion,
                total_amount=total_amount,
                status=initial_order_status,
            )

            payment = Payment.objects.create(
                order=order,
                payment_method=payment_method,
                amount=total_amount,
                status=pending_payment_status,
            )

            # Step 8 - Create order lines and deduct stock from locked rows.
            order_lines = []
            stock_changes = []
            for cart_item in cart_items:
                product_item = product_item_map[cart_item.product_item_id]
                order_lines.append(
                    OrderLine(
                        order=order,
                        product_item=product_item,
                        price=product_item.price,
                        quantity=cart_item.quantity,
                    )
                )

                stock_changes.append(
                    StockChange(
                        product_item=product_item,
                        quantity_change=-cart_item.quantity,
                        reason=InventoryLedgerEntry.Reason.CHECKOUT,
                        order=order,
                        actor=request.user,
                        idempotency_key=(
                            f"order:{order.pk}:stock-deducted:"
                            f"item:{product_item.pk}"
                        ),
                    )
                )

            OrderLine.objects.bulk_create(order_lines)
            try:
                apply_locked_stock_changes(stock_changes)
            except InventoryError as exc:
                raise ValidationError({"inventory": exc.message}) from exc

            # Step 9 - Clear cart after the order has been created successfully.
            CartItem.objects.filter(cart=cart).delete()

            order = (
                Order.objects.select_related(
                    "user",
                    "shipping_method",
                    "shipping_address",
                    "promotion",
                    "status",
                )
                .prefetch_related("lines__product_item__product")
                .get(pk=order.pk)
            )

        response_data = OrderSerializer(order).data
        payment_data = {
            "id": payment.pk,
            "provider": provider_name,
            "amount": str(payment.amount),
            "status": payment.status.name,
            "requires_action": provider_name != "cod",
        }

        if provider_name != "cod":
            try:
                _, gateway_data = initialize_payment_gateway(request, payment)
                payment_data.update(gateway_data)
            except APIException as exc:
                payment_data.update(
                    {
                        "gateway_error": exc.detail,
                        "retry_url": f"/api/payments/{payment.pk}/initialize/",
                    }
                )

        response_data["payment"] = payment_data
        return Response(response_data, status=status.HTTP_201_CREATED)

    @staticmethod
    def generate_order_code():
        today = timezone.now().strftime("%Y%m%d")

        for _ in range(10):
            order_code = f"ORD-{today}-{uuid4().hex[:10].upper()}"
            if not Order.objects.filter(order_code=order_code).exists():
                return order_code

        raise ValidationError({"order_code": "Could not generate a unique order code."})


class CustomerOrderViewSet(ReadOnlyModelViewSet):
    serializer_class = OrderDetailSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return optimized_order_queryset().filter(user=self.request.user)

    @action(detail=True, methods=("post",), url_path="cancel")
    def cancel(self, request, pk=None):
        with transaction.atomic():
            order = (
                Order.objects.select_for_update()
                .select_related("status")
                .filter(pk=pk, user=request.user)
                .first()
            )
            if order is None:
                raise NotFound("Order does not exist.")

            current_status = normalize_status_name(order.status.name)
            if current_status not in CUSTOMER_CANCELLABLE_STATUSES:
                raise ValidationError(
                    {
                        "status": (
                            "Only pending or confirmed orders can be cancelled. "
                            f"Current status is '{current_status}'."
                        )
                    }
                )

            cancelled_status = get_configured_order_status("cancelled")
            try:
                restore_order_stock(
                    order=order,
                    reason=InventoryLedgerEntry.Reason.ORDER_CANCELLED,
                    actor=request.user,
                    note="Stock restored after customer cancellation.",
                )
            except InventoryError as exc:
                raise ValidationError({"inventory": exc.message}) from exc
            sync_cod_payment_status(order, "cancelled")
            order.status = cancelled_status
            order.save(update_fields=("status",))

            order = self.get_queryset().get(pk=order.pk)
            return Response(self.get_serializer(order).data, status=status.HTTP_200_OK)


class AdminOrderViewSet(ReadOnlyModelViewSet):
    serializer_class = OrderDetailSerializer
    permission_classes = (IsAuthenticated, IsAdminRole | IsStaffRole)

    def get_queryset(self):
        queryset = optimized_order_queryset()
        status_name = self.request.query_params.get("status", "").strip()
        search_term = self.request.query_params.get("search", "").strip()

        if status_name:
            queryset = queryset.filter(status__name__iexact=status_name)
        if search_term:
            queryset = queryset.filter(order_code__icontains=search_term)

        return queryset

    @action(detail=True, methods=("patch",), url_path="status")
    def update_status(self, request, pk=None):
        serializer = OrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status_name = serializer.validated_data["status"]

        with transaction.atomic():
            order = (
                Order.objects.select_for_update()
                .select_related("status")
                .filter(pk=pk)
                .first()
            )
            if order is None:
                raise NotFound("Order does not exist.")

            current_status_name = normalize_status_name(order.status.name)
            if current_status_name == new_status_name:
                order = self.get_queryset().get(pk=order.pk)
                return Response(
                    self.get_serializer(order).data,
                    status=status.HTTP_200_OK,
                )

            if not is_admin_transition_allowed(
                current_status_name,
                new_status_name,
            ):
                allowed_statuses = sorted(
                    allowed_admin_transitions(current_status_name)
                )
                allowed_message = ", ".join(allowed_statuses) or "none"
                raise ValidationError(
                    {
                        "status": (
                            f"Order status cannot change from "
                            f"'{current_status_name}' to '{new_status_name}'. "
                            f"Allowed next statuses: {allowed_message}."
                        )
                    }
                )

            new_status = get_configured_order_status(new_status_name)
            if new_status_name in RESTOCKED_ORDER_STATUSES:
                reason = (
                    InventoryLedgerEntry.Reason.ORDER_CANCELLED
                    if new_status_name == "cancelled"
                    else InventoryLedgerEntry.Reason.ORDER_REFUNDED
                )
                try:
                    restore_order_stock(
                        order=order,
                        reason=reason,
                        actor=request.user,
                        note="Stock restored after admin order status update.",
                    )
                except InventoryError as exc:
                    raise ValidationError({"inventory": exc.message}) from exc

            sync_cod_payment_status(order, new_status_name)

            order.status = new_status
            order.save(update_fields=("status",))

            order = self.get_queryset().get(pk=order.pk)
            return Response(
                self.get_serializer(order).data,
                status=status.HTTP_200_OK,
            )
