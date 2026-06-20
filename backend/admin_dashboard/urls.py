from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    PaymentMethodViewSet,
    BrandViewSet,
    BusinessStatisticsAPIView,
    CategoryViewSet,
    CustomerAccountViewSet,
    DiscountTypeViewSet,
    EmployeeAccountViewSet,
    ProductItemViewSet,
    ProductViewSet,
    PromotionViewSet,
    ReviewModerationViewSet,
    ShippingMethodViewSet,
)


app_name = "admin_dashboard"

router = DefaultRouter()
router.register("products", ProductViewSet, basename="product")
router.register("brands", BrandViewSet, basename="brand")
router.register("categories", CategoryViewSet, basename="category")
router.register("product-items", ProductItemViewSet, basename="product-item")
router.register("customers", CustomerAccountViewSet, basename="customer-account")
router.register("employees", EmployeeAccountViewSet, basename="employee-account")
router.register("promotions", PromotionViewSet, basename="promotion")
router.register("discount-types", DiscountTypeViewSet, basename="discount-type")
router.register("payment-methods", PaymentMethodViewSet, basename="payment-method")
router.register("shipping-methods", ShippingMethodViewSet, basename="shipping-method")
router.register("reviews", ReviewModerationViewSet, basename="review")

urlpatterns = [
    path("statistics/", BusinessStatisticsAPIView.as_view(), name="statistics"),
    *router.urls,
]
