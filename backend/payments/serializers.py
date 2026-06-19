from rest_framework import serializers

from orders.models import Order

from .models import Payment, PaymentMethod, PaymentStatus


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ("id", "name", "description")
        read_only_fields = fields


class PaymentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentStatus
        fields = ("id", "name")
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    order_id = serializers.PrimaryKeyRelatedField(
        source="order",
        queryset=Order.objects.select_related("user"),
        write_only=True,
    )
    payment_method_id = serializers.PrimaryKeyRelatedField(
        source="payment_method",
        queryset=PaymentMethod.objects.all(),
        write_only=True,
    )
    payment_method = PaymentMethodSerializer(read_only=True)
    status = PaymentStatusSerializer(read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "order_id",
            "payment_method_id",
            "payment_method",
            "provider_transaction_id",
            "amount",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "payment_method",
            "provider_transaction_id",
            "amount",
            "status",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        order = attrs.get("order")

        if request and order.user_id != request.user.id:
            raise serializers.ValidationError(
                {"order_id": "This order does not belong to the current user."}
            )

        return attrs
