from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from orders.models import Order

from .models import Promotion


class ApplyPromotionSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=100)
    cart_total = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0)

    def validate_code(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Promotion code is required")
        return value.upper()

    def validate(self, attrs):
        code = attrs["code"]
        cart_total = attrs["cart_total"]

        try:
            promotion = Promotion.objects.select_related("discount_type").get(
                code__iexact=code
            )
        except Promotion.DoesNotExist:
            raise serializers.ValidationError(
                {"code": "Promotion code does not exist"}
            )

        now = timezone.now()
        if now < promotion.start_date:
            raise serializers.ValidationError(
                {"code": "Promotion code has not started yet"}
            )

        if now > promotion.end_date:
            raise serializers.ValidationError({"code": "Promotion code has expired"})

        min_order_value = promotion.min_order_value or Decimal("0.00")
        if cart_total < min_order_value:
            raise serializers.ValidationError(
                {
                    "cart_total": (
                        "Order total is less than minimum required "
                        f"({min_order_value})"
                    )
                }
            )

        if promotion.usage_limit is not None:
            used_count = Order.objects.filter(promotion_id=promotion.id).count()
            if used_count >= promotion.usage_limit:
                raise serializers.ValidationError(
                    {"code": "Promotion usage limit has been reached"}
                )

        discount_type = promotion.discount_type.name.strip().lower()
        if discount_type not in {
            "percentage",
            "percent",
            "percent_off",
            "fixed_amount",
            "fixed",
            "amount",
        }:
            raise serializers.ValidationError(
                {"discount_type": "Unsupported promotion discount type"}
            )

        attrs["promotion"] = promotion
        return attrs
