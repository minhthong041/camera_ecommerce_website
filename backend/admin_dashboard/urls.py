from rest_framework.routers import DefaultRouter

from .views import (
    PaymentMethodViewSet,
    ProductItemViewSet,
    ProductViewSet,
    PromotionViewSet,
    ShippingMethodViewSet,
)


app_name = "admin_dashboard"

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("product-items", ProductItemViewSet, basename="product-item")
router.register("promotions", PromotionViewSet, basename="promotion")
router.register("payment-methods", PaymentMethodViewSet, basename="payment-method")
router.register("shipping-methods", ShippingMethodViewSet, basename="shipping-method")

urlpatterns = router.urls
