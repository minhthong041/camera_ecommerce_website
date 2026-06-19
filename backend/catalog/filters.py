from django_filters import rest_framework as filters

from .models import Product, ProductItem


class ProductOrderingFilter(filters.OrderingFilter):
    ordering_map = {
        "price_asc": "min_price",
        "price_desc": "-min_price",
        "newest": "-id",
    }

    def filter(self, queryset, value):
        if not value:
            return queryset

        ordering = [
            self.ordering_map[item]
            for item in value
            if item in self.ordering_map
        ]
        return queryset.order_by(*ordering) if ordering else queryset


class ProductFilter(filters.FilterSet):
    price_min = filters.NumberFilter(field_name="min_price", lookup_expr="gte")
    price_max = filters.NumberFilter(field_name="min_price", lookup_expr="lte")
    brand = filters.NumberFilter(field_name="brand_id")
    category = filters.NumberFilter(field_name="category_id")
    in_stock = filters.BooleanFilter(method="filter_in_stock")
    condition = filters.CharFilter(method="filter_condition")
    sort = ProductOrderingFilter(
        choices=(
            ("price_asc", "Price: low to high"),
            ("price_desc", "Price: high to low"),
            ("newest", "Newest"),
        )
    )

    class Meta:
        model = Product
        fields = ()

    def filter_in_stock(self, queryset, name, value):
        if value is None:
            return queryset
        if value:
            return queryset.filter(total_stock__gt=0)
        return queryset.filter(total_stock__lte=0)

    def filter_condition(self, queryset, name, value):
        if not value:
            return queryset
        matching_product_ids = ProductItem.objects.filter(
            condition__iexact=value.strip()
        ).values("product_id")
        return queryset.filter(pk__in=matching_product_ids).distinct()
