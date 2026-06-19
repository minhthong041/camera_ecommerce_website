from django.urls import path

from .views import (
    PaymentCreateView,
    PaymentDetailView,
    PaymentMethodListView,
    PaymentStatusListView,
)


app_name = "payments"

urlpatterns = [
    path("methods/", PaymentMethodListView.as_view(), name="payment-method-list"),
    path("statuses/", PaymentStatusListView.as_view(), name="payment-status-list"),
    path("", PaymentCreateView.as_view(), name="payment-create"),
    path("<int:pk>/", PaymentDetailView.as_view(), name="payment-update"),
]
