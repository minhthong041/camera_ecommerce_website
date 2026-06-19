from rest_framework import serializers

from catalog.models import ProductItem

from .models import Order, OrderLine


STANDARD_ORDER_STATUSES = (
    "pending",
    "confirmed",
    "processing",
    "shipping",
    "delivered",
    "cancelled",
    "refunded",
)


class CheckoutSerializer(serializers.Serializer):
    shipping_address_id = serializers.IntegerField(min_value=1)
    shipping_method_id = serializers.IntegerField(min_value=1)
    promotion_code = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    def validate_promotion_code(self, value):
        if value is None:
            return None

        value = value.strip()
        return value.upper() if value else None


class ProductItemSummarySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = ProductItem
        fields = (
            "id",
            "sku",
            "product_name",
            "price",
            "condition",
            "product_image",
        )
        read_only_fields = fields


class OrderLineSerializer(serializers.ModelSerializer):
    product_item_id = serializers.IntegerField(read_only=True)
    product_item = ProductItemSummarySerializer(read_only=True)
    sku = serializers.CharField(source="product_item.sku", read_only=True)
    product_name = serializers.CharField(
        source="product_item.product.name",
        read_only=True,
    )
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderLine
        fields = (
            "id",
            "product_item_id",
            "product_item",
            "sku",
            "product_name",
            "price",
            "quantity",
            "line_total",
        )
        read_only_fields = fields

    def get_line_total(self, obj):
        return obj.price * obj.quantity


class OrderSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    shipping_method_id = serializers.IntegerField(read_only=True)
    shipping_address_id = serializers.IntegerField(read_only=True)
    promotion_id = serializers.IntegerField(read_only=True)
    status_id = serializers.IntegerField(read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)
    lines = OrderLineSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_code",
            "user_id",
            "shipping_method_id",
            "shipping_address_id",
            "promotion_id",
            "total_amount",
            "status_id",
            "status_name",
            "created_at",
            "lines",
        )
        read_only_fields = fields


class OrderDetailSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    shipping_method_id = serializers.IntegerField(read_only=True)
    shipping_address_id = serializers.IntegerField(read_only=True)
    promotion_id = serializers.IntegerField(read_only=True)
    status_id = serializers.IntegerField(read_only=True)
    status_name = serializers.CharField(source="status.name", read_only=True)
    order_lines = OrderLineSerializer(source="lines", many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "order_code",
            "user_id",
            "shipping_method_id",
            "shipping_address_id",
            "promotion_id",
            "total_amount",
            "status_id",
            "status_name",
            "created_at",
            "order_lines",
        )
        read_only_fields = fields


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.CharField(max_length=50)

    def validate_status(self, value):
        normalized_status = value.strip().lower()
        if normalized_status not in STANDARD_ORDER_STATUSES:
            allowed_statuses = ", ".join(STANDARD_ORDER_STATUSES)
            raise serializers.ValidationError(
                f"Invalid order status. Allowed values: {allowed_statuses}."
            )
        return normalized_status
