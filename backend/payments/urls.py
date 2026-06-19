from django.urls import path

from .views import (
    PaymentCreateView,
    PaymentMethodListView,
    PaymentStatusListView,
    StripeWebhookView,
    VNPayCallbackView,
)


app_name = "payments"

urlpatterns = [
    path("methods/", PaymentMethodListView.as_view(), name="payment-method-list"),
    path("statuses/", PaymentStatusListView.as_view(), name="payment-status-list"),
    path("", PaymentCreateView.as_view(), name="payment-create"),
    path(
        "vnpay/callback/",
        VNPayCallbackView.as_view(),
        name="vnpay-callback",
    ),
    path(
        "stripe/webhook/",
        StripeWebhookView.as_view(),
        name="stripe-webhook",
    ),
]
