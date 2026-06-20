from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from catalog.models import ProductItem

from .models import (
    Order,
    OrderLine,
    ReturnRequest,
    ReturnRequestStatus,
    ShippingMethod,
)


STANDARD_ORDER_STATUSES = (
    "pending",
    "confirmed",
    "processing",
    "shipping",
    "delivered",
    "cancelled",
    "refunded",
)
RETURN_WINDOW_DAYS = 15


class ReturnRequestSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(read_only=True)
    order_code = serializers.CharField(source="order.order_code", read_only=True)
    order_status = serializers.CharField(source="order.status.name", read_only=True)
    user_id = serializers.IntegerField(read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    status = serializers.CharField(source="status.name", read_only=True)

    class Meta:
        model = ReturnRequest
        fields = (
            "id",
            "order_id",
            "order_code",
            "order_status",
            "user_id",
            "user_email",
            "reason",
            "status",
            "created_at",
        )
        read_only_fields = fields


class ReturnRequestCreateSerializer(serializers.ModelSerializer):
    order_id = serializers.PrimaryKeyRelatedField(
        source="order",
        queryset=Order.objects.select_related("status", "user"),
    )
    reason = serializers.CharField(trim_whitespace=True, allow_blank=False)

    class Meta:
        model = ReturnRequest
        fields = ("order_id", "reason")

    def validate(self, attrs):
        self.validate_order(attrs["order"], self.context["request"].user)
        return attrs

    @staticmethod
    def validate_order(order, user):
        if order.user_id != user.id:
            raise serializers.ValidationError(
                {"order_id": "This order does not belong to the current user."}
            )

        if order.status.name.strip().lower() != "delivered":
            raise serializers.ValidationError(
                {"order_id": "Only delivered orders can be returned."}
            )

        return_deadline = order.created_at + timedelta(days=RETURN_WINDOW_DAYS)
        if timezone.now() > return_deadline:
            raise serializers.ValidationError(
                {"order_id": "Đã quá thời hạn yêu cầu đổi trả"}
            )

        if ReturnRequest.objects.filter(order=order).exists():
            raise serializers.ValidationError(
                {"order_id": "A return request already exists for this order."}
            )

    def create(self, validated_data):
        user = self.context["request"].user
        order = validated_data["order"]

        try:
            with transaction.atomic():
                locked_order = (
                    Order.objects.select_for_update()
                    .select_related("status", "user")
                    .get(pk=order.pk)
                )
                self.validate_order(locked_order, user)
                pending_status = ReturnRequestStatus.objects.filter(
                    name__iexact="pending"
                ).first()
                if pending_status is None:
                    raise serializers.ValidationError(
                        {"status": "Pending return request status is not configured."}
                    )
                return ReturnRequest.objects.create(
                    order=locked_order,
                    user=user,
                    reason=validated_data["reason"],
                    status=pending_status,
                )
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"order_id": "A return request already exists for this order."}
            ) from exc


class ReturnRequestStatusUpdateSerializer(serializers.Serializer):
    status = serializers.CharField(max_length=20)

    def validate_status(self, value):
        normalized_status = value.strip().lower()
        if normalized_status not in {"approved", "rejected"}:
            raise serializers.ValidationError(
                "Status must be either 'Approved' or 'Rejected'."
            )
        return normalized_status


class CheckoutSerializer(serializers.Serializer):
    shipping_address_id = serializers.IntegerField(min_value=1)
    shipping_method_id = serializers.IntegerField(min_value=1)
    payment_method_id = serializers.IntegerField(min_value=1)
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


class ShippingMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingMethod
        fields = ("id", "name", "price")
        read_only_fields = fields


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
