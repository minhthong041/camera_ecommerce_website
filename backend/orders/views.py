from decimal import Decimal
from uuid import uuid4

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.models import CartItem, ShoppingCart
from catalog.models import ProductItem
from locations.models import Address
from promotions.models import Promotion

from .models import Order, OrderLine, OrderStatus, ShippingMethod
from .serializers import CheckoutSerializer, OrderSerializer


MONEY_QUANTIZER = Decimal("0.01")


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

            # Step 5 - Fetch shipping method and add shipping fee.
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

            shipping_fee = shipping_method.price.quantize(MONEY_QUANTIZER)

            # Step 6 - Apply promotion, if provided.
            promotion = None
            discount_amount = Decimal("0.00")
            promotion_code = checkout_data.get("promotion_code")
            if promotion_code:
                promotion = self.get_valid_promotion(promotion_code, subtotal)
                discount_amount = self.calculate_discount_amount(promotion, subtotal)

            total_amount = (
                subtotal + shipping_fee - discount_amount
            ).quantize(MONEY_QUANTIZER)

            # Step 7 - Create order with Pending status and a unique order code.
            pending_status = OrderStatus.objects.filter(name__iexact="pending").first()
            if pending_status is None:
                raise ValidationError(
                    {"status": "Pending order status is not configured."}
                )

            order = Order.objects.create(
                order_code=self.generate_order_code(),
                user=request.user,
                shipping_method=shipping_method,
                shipping_address=shipping_address,
                promotion=promotion,
                total_amount=total_amount,
                status=pending_status,
            )

            # Step 8 - Create order lines and deduct stock from locked rows.
            order_lines = []
            product_items_to_update = []
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

                product_item.qty_in_stock -= cart_item.quantity
                product_items_to_update.append(product_item)

            OrderLine.objects.bulk_create(order_lines)
            ProductItem.objects.bulk_update(
                product_items_to_update,
                ["qty_in_stock"],
            )

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

            response_serializer = OrderSerializer(order)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def get_valid_promotion(self, promotion_code, subtotal):
        try:
            promotion = (
                Promotion.objects.select_for_update()
                .select_related("discount_type")
                .get(code__iexact=promotion_code)
            )
        except Promotion.DoesNotExist:
            raise ValidationError({"promotion_code": "Promotion code does not exist."})

        now = timezone.now()
        if now < promotion.start_date:
            raise ValidationError(
                {"promotion_code": "Promotion code has not started yet."}
            )

        if now > promotion.end_date:
            raise ValidationError({"promotion_code": "Promotion code has expired."})

        min_order_value = promotion.min_order_value or Decimal("0.00")
        if subtotal < min_order_value:
            raise ValidationError(
                {
                    "promotion_code": (
                        "Order subtotal is less than the minimum required "
                        f"({min_order_value})."
                    )
                }
            )

        if promotion.usage_limit is not None:
            used_count = Order.objects.filter(promotion_id=promotion.id).count()
            if used_count >= promotion.usage_limit:
                raise ValidationError(
                    {"promotion_code": "Promotion usage limit has been reached."}
                )

        return promotion

    @staticmethod
    def calculate_discount_amount(promotion, subtotal):
        discount_type = promotion.discount_type.name.strip().lower()

        if discount_type in {"percentage", "percent", "percent_off"}:
            discount_amount = subtotal * promotion.discount_value / Decimal("100")
        elif discount_type in {"fixed_amount", "fixed", "amount"}:
            discount_amount = promotion.discount_value
        else:
            raise ValidationError(
                {"promotion_code": "Unsupported promotion discount type."}
            )

        if promotion.max_discount is not None:
            discount_amount = min(discount_amount, promotion.max_discount)

        return min(discount_amount, subtotal).quantize(MONEY_QUANTIZER)

    @staticmethod
    def generate_order_code():
        today = timezone.now().strftime("%Y%m%d")

        for _ in range(10):
            order_code = f"ORD-{today}-{uuid4().hex[:10].upper()}"
            if not Order.objects.filter(order_code=order_code).exists():
                return order_code

        raise ValidationError({"order_code": "Could not generate a unique order code."})
