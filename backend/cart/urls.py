from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CartItemViewSet, ShoppingCartViewSet


router = DefaultRouter()
router.register("items", CartItemViewSet, basename="cart-item")
router.register("", ShoppingCartViewSet, basename="cart")

app_name = "cart"

urlpatterns = [
    path("", include(router.urls)),
]
