from rest_framework import serializers

from .models import (
    Brand,
    Category,
    Product,
    ProductConfiguration,
    ProductItem,
    Variation,
    VariationOption,
)


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ("id", "name", "logo_url")


class CategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True)

    class Meta:
        model = Category
        fields = ("id", "parent", "parent_name", "name", "slug", "description")


class ProductItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = ProductItem
        fields = (
            "id",
            "product",
            "product_name",
            "sku",
            "price",
            "qty_in_stock",
            "condition",
            "product_image",
        )


class VariationOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = VariationOption
        fields = ("id", "value")


class VariationSerializer(serializers.ModelSerializer):
    options = VariationOptionSerializer(many=True, read_only=True)

    class Meta:
        model = Variation
        fields = ("id", "name", "options")


class ProductConfigurationSerializer(serializers.ModelSerializer):
    variation_id = serializers.IntegerField(
        source="variation_option.variation_id",
        read_only=True,
    )
    variation_name = serializers.CharField(
        source="variation_option.variation.name",
        read_only=True,
    )
    variation_option_id = serializers.IntegerField(read_only=True)
    variation_option_value = serializers.CharField(
        source="variation_option.value",
        read_only=True,
    )

    class Meta:
        model = ProductConfiguration
        fields = (
            "id",
            "variation_id",
            "variation_name",
            "variation_option_id",
            "variation_option_value",
        )


class ProductItemDetailSerializer(ProductItemSerializer):
    configurations = ProductConfigurationSerializer(many=True, read_only=True)

    class Meta(ProductItemSerializer.Meta):
        fields = ProductItemSerializer.Meta.fields + ("configurations",)


class ProductSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    items = ProductItemSerializer(many=True, read_only=True)
    min_price = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    total_stock = serializers.IntegerField(read_only=True, default=0)
    total_sold = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Product
        fields = (
            "id",
            "category",
            "brand",
            "name",
            "description",
            "tech_specs",
            "is_active",
            "min_price",
            "total_stock",
            "total_sold",
            "items",
        )


class ProductDetailSerializer(serializers.ModelSerializer):
    brand = BrandSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    product_items = ProductItemDetailSerializer(
        source="items",
        many=True,
        read_only=True,
    )
    variations = VariationSerializer(
        source="category.variations",
        many=True,
        read_only=True,
    )

    class Meta:
        model = Product
        fields = (
            "id",
            "category",
            "brand",
            "name",
            "description",
            "tech_specs",
            "is_active",
            "product_items",
            "variations",
        )
