import hashlib
import hmac
from datetime import timedelta
from decimal import Decimal
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

import stripe
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError


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


class GatewayConfigurationError(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Payment gateway is not configured."


def normalize_provider_name(value):
    return (
        value.strip()
        .lower()
        .replace("_", "")
        .replace("-", "")
        .replace(" ", "")
    )


def get_client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "127.0.0.1")


def initialize_payment_gateway(request, payment):
    provider = normalize_provider_name(payment.payment_method.name)
    if provider == "vnpay":
        return provider, create_vnpay_payment(request, payment)
    if provider == "stripe":
        return provider, create_stripe_payment(payment)
    raise ValidationError(
        {"payment_method_id": "Selected payment method is not an online gateway."}
    )


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
        ) from exc

    payment.provider_transaction_id = payment_intent.id
    payment.save(update_fields=("provider_transaction_id", "updated_at"))

    return {
        "client_secret": payment_intent.client_secret,
        "provider_transaction_id": payment_intent.id,
    }
