import hashlib
import hmac
import logging
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import stripe
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import ProductItem
from orders.models import Order, OrderLine, OrderStatus
from orders.state_machine import (
    normalize_status_name,
    payment_failure_restores_stock,
    payment_order_target,
    payment_success_requires_refund,
)

from .models import Payment, PaymentMethod, PaymentStatus
from .serializers import (
    PaymentMethodSerializer,
    PaymentSerializer,
    PaymentStatusSerializer,
)


PAYMENT_SUCCESS_STATUSES = ("completed", "paid")
PAYMENT_FAILED_STATUSES = ("failed",)
ORDER_SUCCESS_STATUSES = ("processing", "paid")
ORDER_FAILED_STATUSES = ("cancelled", "canceled")
TERMINAL_PAYMENT_STATUSES = {
    *PAYMENT_SUCCESS_STATUSES,
    *PAYMENT_FAILED_STATUSES,
}
VNPAY_TIME_ZONE = ZoneInfo("Asia/Ho_Chi_Minh")
ZERO_DECIMAL_CURRENCIES = {
    "bif",
    "clp",
    "djf",
    "gnf",
    "jpy",
    "kmf",
    "krw",
    "mga",
    "pyg",
    "rwf",
    "ugx",
    "vnd",
    "vuv",
    "xaf",
    "xof",
    "xpf",
}
logger = logging.getLogger(__name__)


class GatewayConfigurationError(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Payment gateway is not configured."


def normalize_name(value):
    return value.strip().lower().replace("_", "").replace("-", "").replace(" ", "")


def get_status_object(model, candidates, error_message):
    for candidate in candidates:
        status_object = model.objects.filter(name__iexact=candidate).first()
        if status_object:
            return status_object
    raise GatewayConfigurationError(error_message)


def is_payment_terminal(payment):
    return payment.status.name.strip().lower() in TERMINAL_PAYMENT_STATUSES


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "127.0.0.1")


def restore_order_stock(order):
    order_lines = list(
        OrderLine.objects.filter(order=order)
        .values("product_item_id", "quantity")
        .order_by("product_item_id")
    )
    product_item_ids = [line["product_item_id"] for line in order_lines]
    product_items = {
        item.pk: item
        for item in ProductItem.objects.select_for_update()
        .filter(pk__in=product_item_ids)
        .order_by("pk")
    }

    if len(product_items) != len(set(product_item_ids)):
        raise GatewayConfigurationError(
            "Could not restore stock because an order item no longer exists."
        )

    for line in order_lines:
        product_items[line["product_item_id"]].qty_in_stock += line["quantity"]

    ProductItem.objects.bulk_update(
        list(product_items.values()),
        ["qty_in_stock"],
    )


def process_gateway_result(
    *,
    payment_id,
    provider_transaction_id,
    succeeded,
    gateway_amount=None,
):
    with transaction.atomic():
        payment = (
            Payment.objects.select_for_update()
            .select_related("status")
            .filter(pk=payment_id)
            .first()
        )
        if payment is None:
            raise ValidationError({"payment": "Payment record does not exist."})

        # Re-check idempotency after locking to prevent concurrent callbacks.
        if is_payment_terminal(payment):
            return payment, True

        duplicate_payment = (
            Payment.objects.select_for_update()
            .select_related("status")
            .filter(provider_transaction_id=provider_transaction_id)
            .exclude(pk=payment.pk)
            .first()
        )
        if duplicate_payment:
            if is_payment_terminal(duplicate_payment):
                return duplicate_payment, True
            raise ValidationError(
                {
                    "provider_transaction_id": (
                        "This gateway transaction belongs to another payment."
                    )
                }
            )

        if gateway_amount is not None and gateway_amount != payment.amount:
            raise ValidationError(
                {"amount": "Gateway amount does not match the payment amount."}
            )

        order = (
            Order.objects.select_for_update()
            .select_related("status")
            .get(pk=payment.order_id)
        )

        current_order_status = normalize_status_name(order.status.name)
        target_order_status = payment_order_target(
            current_order_status,
            succeeded=succeeded,
        )

        if succeeded:
            payment_status = get_status_object(
                PaymentStatus,
                PAYMENT_SUCCESS_STATUSES,
                "Completed or Paid payment status is not configured.",
            )
            if payment_success_requires_refund(current_order_status):
                logger.warning(
                    (
                        "Payment %s succeeded after order %s entered %s; "
                        "refund is required."
                    ),
                    payment.pk,
                    order.pk,
                    current_order_status,
                )
        else:
            payment_status = get_status_object(
                PaymentStatus,
                PAYMENT_FAILED_STATUSES,
                "Failed payment status is not configured.",
            )
            if payment_failure_restores_stock(current_order_status):
                restore_order_stock(order)

        order_status = None
        if target_order_status != current_order_status:
            status_candidates = (
                ORDER_SUCCESS_STATUSES if succeeded else ORDER_FAILED_STATUSES
            )
            status_error = (
                "Processing or Paid order status is not configured."
                if succeeded
                else "Cancelled order status is not configured."
            )
            order_status = get_status_object(
                OrderStatus,
                status_candidates,
                status_error,
            )

        payment.provider_transaction_id = provider_transaction_id
        payment.status = payment_status
        payment.save(
            update_fields=(
                "provider_transaction_id",
                "status",
                "updated_at",
            )
        )

        if order_status is not None:
            order.status = order_status
            order.save(update_fields=("status",))

        return payment, False


class PaymentMethodListView(generics.ListAPIView):
    queryset = PaymentMethod.objects.order_by("id")
    serializer_class = PaymentMethodSerializer
    permission_classes = (AllowAny,)


class PaymentStatusListView(generics.ListAPIView):
    queryset = PaymentStatus.objects.order_by("id")
    serializer_class = PaymentStatusSerializer
    permission_classes = (AllowAny,)


class PaymentCreateView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        serializer = PaymentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            requested_order = serializer.validated_data["order"]
            payment_method = serializer.validated_data["payment_method"]
            order = (
                Order.objects.select_for_update()
                .select_related("status")
                .get(pk=requested_order.pk)
            )

            if order.user_id != request.user.id:
                raise ValidationError(
                    {"order_id": "This order does not belong to the current user."}
                )

            if order.status.name.strip().lower() != "pending":
                raise ValidationError(
                    {"order_id": "Only Pending orders can be paid."}
                )

            pending_status = get_status_object(
                PaymentStatus,
                ("pending",),
                "Pending payment status is not configured.",
            )

            existing_payment = (
                Payment.objects.select_for_update()
                .select_related("status")
                .filter(order=order)
                .exclude(status__name__iexact="failed")
                .first()
            )
            if existing_payment:
                raise ValidationError(
                    {"order_id": "Payment has already been initiated for this order."}
                )

            payment = Payment.objects.create(
                order=order,
                payment_method=payment_method,
                amount=order.total_amount,
                status=pending_status,
            )

            provider_name = normalize_name(payment_method.name)
            if provider_name == "vnpay":
                gateway_data = self.create_vnpay_payment(request, payment)
            elif provider_name == "stripe":
                gateway_data = self.create_stripe_payment(payment)
            else:
                raise ValidationError(
                    {
                        "payment_method_id": (
                            "Selected payment method is not an online gateway."
                        )
                    }
                )

            response_data = {
                "payment_id": payment.pk,
                "order_id": order.pk,
                "provider": provider_name,
                "amount": str(payment.amount),
                "status": pending_status.name,
                **gateway_data,
            }
            return Response(response_data, status=status.HTTP_201_CREATED)

    @staticmethod
    def create_vnpay_payment(request, payment):
        required_settings = (
            settings.VNPAY_TMN_CODE,
            settings.VNPAY_HASH_SECRET,
            settings.VNPAY_PAYMENT_URL,
            settings.VNPAY_RETURN_URL,
        )
        if not all(required_settings):
            raise GatewayConfigurationError("VNPay gateway is not configured.")

        now = timezone.now().astimezone(VNPAY_TIME_ZONE)
        params = {
            "vnp_Version": "2.1.0",
            "vnp_Command": "pay",
            "vnp_TmnCode": settings.VNPAY_TMN_CODE,
            "vnp_Amount": str(int(payment.amount * Decimal("100"))),
            "vnp_CurrCode": "VND",
            "vnp_TxnRef": str(payment.pk),
            "vnp_OrderInfo": f"Thanh toan don hang {payment.order.order_code}",
            "vnp_OrderType": "other",
            "vnp_Locale": "vn",
            "vnp_ReturnUrl": settings.VNPAY_RETURN_URL,
            "vnp_IpAddr": get_client_ip(request),
            "vnp_CreateDate": now.strftime("%Y%m%d%H%M%S"),
            "vnp_ExpireDate": (now + timedelta(minutes=15)).strftime(
                "%Y%m%d%H%M%S"
            ),
        }
        query_string = urlencode(sorted(params.items()))
        secure_hash = hmac.new(
            settings.VNPAY_HASH_SECRET.encode(),
            query_string.encode(),
            hashlib.sha512,
        ).hexdigest()

        return {
            "redirect_url": (
                f"{settings.VNPAY_PAYMENT_URL}?{query_string}"
                f"&vnp_SecureHash={secure_hash}"
            )
        }

    @staticmethod
    def create_stripe_payment(payment):
        if not settings.STRIPE_SECRET_KEY:
            raise GatewayConfigurationError("Stripe gateway is not configured.")

        currency = settings.STRIPE_CURRENCY.lower()
        amount = payment.amount
        if currency in ZERO_DECIMAL_CURRENCIES:
            stripe_amount = int(amount.quantize(Decimal("1")))
        else:
            stripe_amount = int((amount * Decimal("100")).quantize(Decimal("1")))

        try:
            client = stripe.StripeClient(settings.STRIPE_SECRET_KEY)
            payment_intent = client.v1.payment_intents.create(
                {
                    "amount": stripe_amount,
                    "currency": currency,
                    "automatic_payment_methods": {"enabled": True},
                    "metadata": {
                        "payment_id": str(payment.pk),
                        "order_id": str(payment.order_id),
                        "order_code": payment.order.order_code,
                    },
                },
                options={
                    "idempotency_key": f"order-{payment.order_id}-stripe-payment"
                },
            )
        except stripe.StripeError as exc:
            raise ValidationError(
                {"payment_gateway": f"Stripe could not create payment: {exc}"}
            )

        payment.provider_transaction_id = payment_intent.id
        payment.save(update_fields=("provider_transaction_id", "updated_at"))

        return {
            "client_secret": payment_intent.client_secret,
            "provider_transaction_id": payment_intent.id,
        }


class VNPayCallbackView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request, *args, **kwargs):
        return self.handle_callback(request)

    def post(self, request, *args, **kwargs):
        return self.handle_callback(request)

    def handle_callback(self, request):
        source = request.query_params if request.query_params else request.data
        params = {
            key: str(source.get(key))
            for key in source.keys()
            if key.startswith("vnp_")
        }
        received_hash = params.pop("vnp_SecureHash", "")
        params.pop("vnp_SecureHashType", None)

        if not settings.VNPAY_HASH_SECRET or not received_hash:
            return Response(
                {"RspCode": "97", "Message": "Invalid signature"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        signed_data = urlencode(sorted(params.items()))
        expected_hash = hmac.new(
            settings.VNPAY_HASH_SECRET.encode(),
            signed_data.encode(),
            hashlib.sha512,
        ).hexdigest()
        if not hmac.compare_digest(received_hash.lower(), expected_hash.lower()):
            return Response(
                {"RspCode": "97", "Message": "Invalid signature"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if params.get("vnp_TmnCode") != settings.VNPAY_TMN_CODE:
            return Response(
                {"RspCode": "02", "Message": "Invalid merchant code"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        provider_transaction_id = params.get("vnp_TransactionNo")
        payment_reference = params.get("vnp_TxnRef")
        if not provider_transaction_id or not payment_reference:
            return Response(
                {"RspCode": "01", "Message": "Missing transaction reference"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Step 2 - Fast idempotency check before opening the transaction.
        existing_payment = (
            Payment.objects.select_related("status")
            .filter(provider_transaction_id=provider_transaction_id)
            .first()
        )
        if existing_payment and is_payment_terminal(existing_payment):
            return Response(
                {"RspCode": "00", "Message": "Transaction already processed"},
                status=status.HTTP_200_OK,
            )

        try:
            payment_id = int(payment_reference)
            gateway_amount = (
                Decimal(params["vnp_Amount"]) / Decimal("100")
            ).quantize(Decimal("0.01"))
        except (KeyError, ValueError, InvalidOperation):
            return Response(
                {"RspCode": "04", "Message": "Invalid payment data"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        succeeded = (
            params.get("vnp_ResponseCode") == "00"
            and params.get("vnp_TransactionStatus") == "00"
        )

        try:
            payment, duplicate = process_gateway_result(
                payment_id=payment_id,
                provider_transaction_id=provider_transaction_id,
                succeeded=succeeded,
                gateway_amount=gateway_amount,
            )
        except ValidationError as exc:
            return Response(
                {"RspCode": "01", "Message": exc.detail},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "RspCode": "00",
                "Message": (
                    "Transaction already processed"
                    if duplicate
                    else "Payment result recorded"
                ),
                "payment_id": payment.pk,
            },
            status=status.HTTP_200_OK,
        )


class StripeWebhookView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request, *args, **kwargs):
        if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_WEBHOOK_SECRET:
            raise GatewayConfigurationError("Stripe webhook is not configured.")

        signature = request.headers.get("Stripe-Signature")
        if not signature:
            return Response(
                {"detail": "Missing Stripe-Signature header."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            client = stripe.StripeClient(settings.STRIPE_SECRET_KEY)
            event = client.construct_event(
                request.body,
                signature,
                settings.STRIPE_WEBHOOK_SECRET,
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            return Response(
                {"detail": "Invalid Stripe webhook signature."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event_type = event["type"]
        if event_type not in {
            "payment_intent.succeeded",
            "payment_intent.payment_failed",
            "payment_intent.canceled",
        }:
            return Response(
                {"detail": "Event ignored."},
                status=status.HTTP_200_OK,
            )

        payment_intent = event["data"]["object"]
        provider_transaction_id = payment_intent["id"]

        # Step 2 - Fast idempotency check before opening the transaction.
        existing_payment = (
            Payment.objects.select_related("status")
            .filter(provider_transaction_id=provider_transaction_id)
            .first()
        )
        if existing_payment and is_payment_terminal(existing_payment):
            return Response(
                {"detail": "Transaction already processed."},
                status=status.HTTP_200_OK,
            )

        try:
            metadata = payment_intent["metadata"]
        except KeyError:
            metadata = {}

        try:
            payment_id = metadata["payment_id"]
        except KeyError:
            payment_id = None

        if not payment_id and existing_payment:
            payment_id = existing_payment.pk

        try:
            payment_id = int(payment_id)
            currency = payment_intent["currency"].lower()
            if currency != settings.STRIPE_CURRENCY.lower():
                raise ValueError

            try:
                metadata_order_id = metadata["order_id"]
            except KeyError:
                metadata_order_id = None

            if existing_payment and metadata_order_id:
                if int(metadata_order_id) != existing_payment.order_id:
                    raise ValueError

            stripe_amount = Decimal(payment_intent["amount"])
            if currency in ZERO_DECIMAL_CURRENCIES:
                gateway_amount = stripe_amount.quantize(Decimal("0.01"))
            else:
                gateway_amount = (stripe_amount / Decimal("100")).quantize(
                    Decimal("0.01")
                )
        except (KeyError, TypeError, ValueError, InvalidOperation):
            return Response(
                {"detail": "Stripe event is missing payment metadata."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        succeeded = event_type == "payment_intent.succeeded"
        try:
            payment, duplicate = process_gateway_result(
                payment_id=payment_id,
                provider_transaction_id=provider_transaction_id,
                succeeded=succeeded,
                gateway_amount=gateway_amount,
            )
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "detail": (
                    "Transaction already processed."
                    if duplicate
                    else "Payment result recorded."
                ),
                "payment_id": payment.pk,
            },
            status=status.HTTP_200_OK,
        )
