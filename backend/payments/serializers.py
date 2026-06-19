from django.db.models import Q
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
            "status",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        request = self.context.get("request")
        order = attrs.get("order")
        amount = attrs.get("amount")

        if request and order.user_id != request.user.id:
            raise serializers.ValidationError(
                {"order_id": "This order does not belong to the current user."}
            )

        if amount != order.total_amount:
            raise serializers.ValidationError(
                {"amount": "Payment amount must match the order total amount."}
            )

        return attrs


class PaymentUpdateSerializer(serializers.ModelSerializer):
    provider_transaction_id = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
    )
    status = serializers.CharField(write_only=True)
    payment_status = PaymentStatusSerializer(source="status", read_only=True)

    class Meta:
        model = Payment
        fields = (
            "id",
            "provider_transaction_id",
            "status",
            "payment_status",
            "amount",
            "updated_at",
        )
        read_only_fields = ("id", "payment_status", "amount", "updated_at")
        extra_kwargs = {
            "provider_transaction_id": {
                "validators": [],
            },
        }

    def validate_provider_transaction_id(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("provider_transaction_id is required.")

        exists = Payment.objects.filter(
            provider_transaction_id__iexact=value
        ).exclude(pk=self.instance.pk)
        if exists.exists():
            raise serializers.ValidationError(
                "This provider transaction has already been recorded."
            )

        return value

    def validate_status(self, value):
        normalized_status = value.strip().lower()
        if normalized_status in {"completed", "complete", "paid"}:
            candidates = ("completed", "paid")
        elif normalized_status == "failed":
            candidates = ("failed",)
        else:
            raise serializers.ValidationError(
                "Payment status must be Completed or Failed."
            )

        status = PaymentStatus.objects.filter(
            Q(name__iexact=candidates[0])
            | Q(name__iexact=candidates[-1])
        ).first()

        if status is None:
            raise serializers.ValidationError(
                "Configured payment status does not exist."
            )

        self.payment_status = status
        return value

    def update(self, instance, validated_data):
        validated_data.pop("status", None)
        instance.provider_transaction_id = validated_data.get(
            "provider_transaction_id",
            instance.provider_transaction_id,
        )
        instance.status = self.payment_status
        instance.save(
            update_fields=(
                "provider_transaction_id",
                "status",
                "updated_at",
            )
        )
        return instance
