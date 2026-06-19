from django.db.models import IntegerField, Min, Prefetch, Sum, Value
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from .filters import ProductFilter
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
    filterset_class = ProductFilter
    search_fields = ("name",)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductSerializer

    def get_queryset(self):
        product_items_queryset = ProductItem.objects.select_related(
            "product"
        ).order_by("sku")
        queryset = (
            Product.objects.filter(is_active=True)
            .select_related("brand", "category", "category__parent")
            .annotate(
                min_price=Min("items__price"),
                total_stock=Coalesce(
                    Sum("items__qty_in_stock"),
                    Value(0),
                    output_field=IntegerField(),
                ),
            )
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

    @action(detail=True, methods=("get",), url_path="related")
    def related(self, request, pk=None):
        product = self.get_object()
        related_products = list(
            self.get_queryset()
            .filter(category_id=product.category_id)
            .exclude(pk=product.pk)
            .order_by("name")[:8]
        )
        serializer = ProductSerializer(
            related_products,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)

    @action(detail=False, methods=("get",), url_path="best-sellers")
    def best_sellers(self, request):
        sales_ranking = list(
            Product.objects.filter(is_active=True)
            .annotate(total_sold=Sum("items__order_lines__quantity"))
            .filter(total_sold__isnull=False)
            .order_by("-total_sold", "-id")
            .values_list("id", "total_sold")[:10]
        )

        if not sales_ranking:
            return Response([])

        product_ids = [product_id for product_id, _ in sales_ranking]
        total_sold_by_product = dict(sales_ranking)
        products_by_id = {
            product.pk: product
            for product in self.get_queryset().filter(pk__in=product_ids)
        }

        best_sellers = []
        for product_id in product_ids:
            product = products_by_id[product_id]
            product.total_sold = total_sold_by_product[product_id]
            best_sellers.append(product)

        serializer = ProductSerializer(
            best_sellers,
            many=True,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)


class ProductItemViewSet(ReadOnlyModelViewSet):
    serializer_class = ProductItemSerializer

    def get_queryset(self):
        return ProductItem.objects.select_related("product").order_by("sku")
