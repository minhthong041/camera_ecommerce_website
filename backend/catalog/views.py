from django.db.models import Prefetch
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.viewsets import ReadOnlyModelViewSet

from .models import (
    Brand,
    Category,
    Product,
    ProductConfiguration,
    ProductItem,
    Variation,
)
from .serializers import (
    BrandSerializer,
    CategorySerializer,
    ProductDetailSerializer,
    ProductItemSerializer,
    ProductSerializer,
)


class ProductPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 100


class BrandViewSet(ReadOnlyModelViewSet):
    queryset = Brand.objects.order_by("name")
    serializer_class = BrandSerializer


class CategoryViewSet(ReadOnlyModelViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return Category.objects.select_related("parent").order_by("name")


class ProductViewSet(ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    pagination_class = ProductPagination
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ("category", "brand")
    search_fields = ("name",)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductSerializer

    def get_queryset(self):
        product_items_queryset = ProductItem.objects.order_by("sku")
        queryset = (
            Product.objects.filter(is_active=True)
            .select_related("brand", "category", "category__parent")
            .order_by("name")
        )

        if self.action == "retrieve":
            product_items_queryset = product_items_queryset.prefetch_related(
                Prefetch(
                    "configurations",
                    queryset=ProductConfiguration.objects.select_related(
                        "variation_option",
                        "variation_option__variation",
                    ).order_by(
                        "variation_option__variation__name",
                        "variation_option__value",
                    ),
                )
            )
            return queryset.prefetch_related(
                Prefetch("items", queryset=product_items_queryset),
                Prefetch(
                    "category__variations",
                    queryset=Variation.objects.prefetch_related("options").order_by(
                        "name"
                    ),
                ),
            )

        return queryset.prefetch_related(
            Prefetch("items", queryset=product_items_queryset)
        )


class ProductItemViewSet(ReadOnlyModelViewSet):
    serializer_class = ProductItemSerializer

    def get_queryset(self):
        return ProductItem.objects.select_related("product").order_by("sku")
