from django.core.validators import MaxValueValidator, MinValueValidator
from rest_framework import serializers

from catalog.models import ProductItem
from orders.models import OrderLine

from .models import Review


class ReviewProductItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = ProductItem
        fields = (
            "id",
            "product_id",
            "product_name",
            "sku",
        )
        read_only_fields = fields


class ReviewReadSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    product_item = ReviewProductItemSerializer(read_only=True)
    order_line_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Review
        fields = (
            "id",
            "user",
            "product_item",
            "order_line_id",
            "rating",
            "comment",
            "created_at",
        )
        read_only_fields = fields

    def get_user(self, obj):
        display_name = obj.user.full_name or obj.user.username or "Customer"
        return {"display_name": self._mask_name(display_name)}

    @staticmethod
    def _mask_name(name):
        masked_parts = []
        for part in name.strip().split():
            if len(part) <= 1:
                masked_parts.append(part)
            else:
                masked_parts.append(f"{part[0]}{'*' * (len(part) - 1)}")
        return " ".join(masked_parts) or "Customer"


class ReviewWriteSerializer(serializers.ModelSerializer):
    order_line_id = serializers.IntegerField(min_value=1, required=False)
    rating = serializers.IntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5),
        ]
    )

    class Meta:
        model = Review
        fields = (
            "order_line_id",
            "rating",
            "comment",
        )
        extra_kwargs = {
            "comment": {
                "required": False,
                "allow_blank": True,
                "allow_null": True,
            }
        }

    def validate(self, attrs):
        if self.instance is not None:
            if "order_line_id" in attrs:
                raise serializers.ValidationError(
                    {"order_line_id": "order_line_id cannot be changed."}
                )
            return attrs

        order_line_id = attrs.pop("order_line_id", None)
        if order_line_id is None:
            raise serializers.ValidationError(
                {"order_line_id": "This field is required."}
            )

        try:
            order_line = (
                OrderLine.objects.select_related(
                    "order",
                    "order__status",
                    "product_item",
                )
                .get(pk=order_line_id)
            )
        except OrderLine.DoesNotExist:
            raise serializers.ValidationError(
                {"order_line_id": "Order line does not exist."}
            )

        request = self.context.get("request")
        if request is None or order_line.order.user_id != request.user.id:
            raise serializers.ValidationError(
                {
                    "order_line_id": (
                        "You can only review items from your own orders."
                    )
                }
            )

        if order_line.order.status.name.strip().lower() != "delivered":
            raise serializers.ValidationError(
                {"order_line_id": "You can only review delivered items."}
            )

        if Review.objects.filter(order_line_id=order_line_id).exists():
            raise serializers.ValidationError(
                {"order_line_id": "This order line has already been reviewed."}
            )

        attrs["order_line"] = order_line
        attrs["product_item"] = order_line.product_item
        return attrs
