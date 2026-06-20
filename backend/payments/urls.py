from django.urls import path

from .views import (
    PaymentCreateView,
    PaymentInitializeView,
    PaymentMethodListView,
    PaymentStatusListView,
    StripeWebhookView,
    VNPayCallbackView,
    VNPayIPNView,
)


app_name = "payments"

urlpatterns = [
    path("methods/", PaymentMethodListView.as_view(), name="payment-method-list"),
    path("statuses/", PaymentStatusListView.as_view(), name="payment-status-list"),
    path("", PaymentCreateView.as_view(), name="payment-create"),
    path(
        "<int:pk>/initialize/",
        PaymentInitializeView.as_view(),
        name="payment-initialize",
    ),
    path(
        "vnpay/callback/",
        VNPayCallbackView.as_view(),
        name="vnpay-callback",
    ),
    path(
        "vnpay/ipn/",
        VNPayIPNView.as_view(),
        name="vnpay-ipn",
    ),
    path(
        "stripe/webhook/",
        StripeWebhookView.as_view(),
        name="stripe-webhook",
    ),
]
