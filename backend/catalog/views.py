from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import Brand, Category, Product, ProductItem
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    ProductItemSerializer,
    ProductSerializer,
)


class BrandViewSet(ReadOnlyModelViewSet):
    queryset = Brand.objects.order_by("name")
    serializer_class = BrandSerializer


class CategoryViewSet(ReadOnlyModelViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.select_related("parent").order_by("name")


class ProductViewSet(ReadOnlyModelViewSet):
    serializer_class = ProductSerializer

    def get_queryset(self):
        return (
            Product.objects.filter(is_active=True)
            .select_related("brand", "category", "category__parent")
            .prefetch_related("items")
            .order_by("name")
        )


class ProductItemViewSet(ReadOnlyModelViewSet):
    serializer_class = ProductItemSerializer

    def get_queryset(self):
        return ProductItem.objects.select_related("product").order_by("sku")
