from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import AdminOrderViewSet, CheckoutAPIView, CustomerOrderViewSet


app_name = "orders"

customer_router = SimpleRouter()
customer_router.register("", CustomerOrderViewSet, basename="customer-order")

admin_router = SimpleRouter()
admin_router.register("", AdminOrderViewSet, basename="admin-order")

urlpatterns = [
    path("orders/checkout/", CheckoutAPIView.as_view(), name="checkout"),
    path("orders/", include(customer_router.urls)),
    path("admin/orders/", include(admin_router.urls)),
]
