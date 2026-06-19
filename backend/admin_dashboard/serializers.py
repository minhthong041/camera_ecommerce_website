from rest_framework import serializers

from catalog.models import Product, ProductItem
from orders.models import ShippingMethod
from payments.models import PaymentMethod
from promotions.models import Promotion


class AdminProductSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "category",
            "category_name",
            "brand",
            "brand_name",
            "name",
            "description",
            "tech_specs",
            "is_active",
        )


class AdminProductItemSerializer(serializers.ModelSerializer):
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


class StockUpdateSerializer(serializers.Serializer):
    qty_in_stock = serializers.IntegerField(min_value=0)

    def validate(self, attrs):
        unexpected_fields = set(self.initial_data) - {"qty_in_stock"}
        if unexpected_fields:
            raise serializers.ValidationError(
                {
                    "non_field_errors": (
                        "Only qty_in_stock can be updated through this endpoint."
                    )
                }
            )
        return attrs


class AdminPromotionSerializer(serializers.ModelSerializer):
    discount_type_name = serializers.CharField(
        source="discount_type.name",
        read_only=True,
    )

    class Meta:
        model = Promotion
        fields = (
            "id",
            "code",
            "name",
            "discount_type",
            "discount_type_name",
            "discount_value",
            "min_order_value",
            "max_discount",
            "start_date",
            "end_date",
            "usage_limit",
            "is_exclusive",
        )


class AdminPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ("id", "name", "description")


class AdminShippingMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingMethod
        fields = ("id", "name", "price")

