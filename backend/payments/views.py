import hashlib
import hmac
import logging
from decimal import Decimal, InvalidOperation
from urllib.parse import urlencode

import stripe
from django.conf import settings
from django.db import transaction
from rest_framework import generics, status
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from inventory.models import InventoryLedgerEntry
from inventory.services import InventoryError, restore_order_stock
from orders.models import Order, OrderStatus
from orders.emails import schedule_order_status_email
from orders.state_machine import (
    normalize_status_name,
    payment_failure_restores_stock,
    payment_order_target,
    payment_success_requires_refund,
)

from .gateways import (
    GatewayConfigurationError,
    ZERO_DECIMAL_CURRENCIES,
    initialize_payment_gateway,
    normalize_provider_name,
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
logger = logging.getLogger(__name__)


def get_status_object(model, candidates, error_message):
    for candidate in candidates:
        status_object = model.objects.filter(name__iexact=candidate).first()
        if status_object:
            return status_object
    raise GatewayConfigurationError(error_message)


def is_payment_terminal(payment):
    return payment.status.name.strip().lower() in TERMINAL_PAYMENT_STATUSES


def vnpay_result_response(payment, message):
    payment_status = payment.status.name.strip().lower()
    return {
        "RspCode": "00",
        "Message": message,
        "is_success": payment_status in PAYMENT_SUCCESS_STATUSES,
        "payment_id": payment.pk,
        "payment_status": payment.status.name,
        "order_id": payment.order_id,
        "order_code": payment.order.order_code,
    }


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
                try:
                    restore_order_stock(
                        order=order,
                        reason=InventoryLedgerEntry.Reason.PAYMENT_FAILED,
                        note="Stock restored after failed payment.",
                    )
                except InventoryError as exc:
                    raise GatewayConfigurationError(exc.message) from exc

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
            schedule_order_status_email(order.pk, "payment_updated")

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
        payment_method = serializer.validated_data["payment_method"]
        provider_name = normalize_provider_name(payment_method.name)
        if provider_name not in {"cod", "vnpay", "stripe"}:
            raise ValidationError(
                {
                    "payment_method_id": (
                        "Only COD, VNPay, and Stripe are currently supported."
                    )
                }
            )

        with transaction.atomic():
            requested_order = serializer.validated_data["order"]
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

            if provider_name == "cod":
                confirmed_status = get_status_object(
                    OrderStatus,
                    ("confirmed",),
                    "Confirmed order status is not configured.",
                )
                order.status = confirmed_status
                order.save(update_fields=("status",))

        gateway_data = {}
        if provider_name != "cod":
            try:
                _, gateway_data = initialize_payment_gateway(request, payment)
            except APIException as exc:
                gateway_data = {
                    "gateway_error": exc.detail,
                    "retry_url": f"/api/payments/{payment.pk}/initialize/",
                }

        response_data = {
            "payment_id": payment.pk,
            "order_id": order.pk,
            "provider": provider_name,
            "amount": str(payment.amount),
            "status": pending_status.name,
            "requires_action": provider_name != "cod",
            **gateway_data,
        }
        return Response(response_data, status=status.HTTP_201_CREATED)


class PaymentInitializeView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, pk, *args, **kwargs):
        payment = (
            Payment.objects.select_related(
                "order",
                "order__status",
                "payment_method",
                "status",
            )
            .filter(pk=pk, order__user=request.user)
            .first()
        )
        if payment is None:
            raise NotFound("Payment record does not exist.")

        if payment.status.name.strip().lower() != "pending":
            raise ValidationError(
                {"payment": "Only Pending payments can be initialized."}
            )

        if payment.order.status.name.strip().lower() != "pending":
            raise ValidationError(
                {"order": "Only Pending orders can initialize online payment."}
            )

        provider_name, gateway_data = initialize_payment_gateway(request, payment)
        return Response(
            {
                "payment_id": payment.pk,
                "order_id": payment.order_id,
                "provider": provider_name,
                "amount": str(payment.amount),
                "status": payment.status.name,
                "requires_action": True,
                **gateway_data,
            },
            status=status.HTTP_200_OK,
        )


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
            Payment.objects.select_related("status", "order")
            .filter(provider_transaction_id=provider_transaction_id)
            .first()
        )
        if existing_payment and is_payment_terminal(existing_payment):
            return Response(
                vnpay_result_response(
                    existing_payment,
                    "Transaction already processed",
                ),
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

        message = (
            "Transaction already processed"
            if duplicate
            else "Payment result recorded"
        )
        return Response(
            vnpay_result_response(payment, message),
            status=status.HTTP_200_OK,
        )


class VNPayIPNView(VNPayCallbackView):
    """Server-to-server notification endpoint using VNPay's response contract."""

    def get(self, request, *args, **kwargs):
        return self.handle_ipn(request)

    def post(self, request, *args, **kwargs):
        return self.handle_ipn(request)

    def handle_ipn(self, request):
        callback_response = super().handle_callback(request)
        response_code = str(callback_response.data.get("RspCode", "99"))

        if callback_response.status_code != status.HTTP_200_OK:
            return Response(
                {
                    "RspCode": response_code,
                    "Message": callback_response.data.get(
                        "Message",
                        "Invalid request",
                    ),
                },
                status=status.HTTP_200_OK,
            )

        # Returning 00 for duplicate notifications stops gateway retries while
        # the transaction-level idempotency guard prevents repeated effects.
        return Response(
            {"RspCode": "00", "Message": "Confirm Success"},
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
