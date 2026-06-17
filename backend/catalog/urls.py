from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BrandViewSet, CategoryViewSet, ProductItemViewSet, ProductViewSet


router = DefaultRouter()
router.register("brands", BrandViewSet, basename="brand")
router.register("categories", CategoryViewSet, basename="category")
router.register("products", ProductViewSet, basename="product")
router.register("product-items", ProductItemViewSet, basename="product-item")

app_name = "catalog"

urlpatterns = [
    path("", include(router.urls)),
]
