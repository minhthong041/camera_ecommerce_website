from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import (
    AdminOrderViewSet,
    AdminReturnRequestListAPIView,
    AdminReturnRequestStatusAPIView,
    CheckoutAPIView,
    CustomerOrderViewSet,
    ReturnRequestListCreateAPIView,
)


app_name = "orders"

customer_router = SimpleRouter()
customer_router.register("", CustomerOrderViewSet, basename="customer-order")

admin_router = SimpleRouter()
admin_router.register("", AdminOrderViewSet, basename="admin-order")

urlpatterns = [
    path(
        "returns/",
        ReturnRequestListCreateAPIView.as_view(),
        name="return-request-list-create",
    ),
    path(
        "admin/returns/",
        AdminReturnRequestListAPIView.as_view(),
        name="admin-return-request-list",
    ),
    path(
        "admin/returns/<int:pk>/status/",
        AdminReturnRequestStatusAPIView.as_view(),
        name="admin-return-request-status",
    ),
    path("orders/checkout/", CheckoutAPIView.as_view(), name="checkout"),
    path("orders/", include(customer_router.urls)),
    path("admin/orders/", include(admin_router.urls)),
]
