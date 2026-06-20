from rest_framework import serializers


class ApplyPromotionSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=100)
    cart_total = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0)

    def validate_code(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Promotion code is required.")
        return value.upper()
