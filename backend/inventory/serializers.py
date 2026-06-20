from rest_framework import serializers

from .models import InventoryLedgerEntry


class InventoryLedgerFilterSerializer(serializers.Serializer):
    product_item_id = serializers.IntegerField(min_value=1, required=False)
    order_id = serializers.IntegerField(min_value=1, required=False)
    reason = serializers.ChoiceField(
        choices=InventoryLedgerEntry.Reason.values,
        required=False,
    )
    created_from = serializers.DateTimeField(required=False)
    created_to = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        created_from = attrs.get("created_from")
        created_to = attrs.get("created_to")
        if created_from and created_to and created_from > created_to:
            raise serializers.ValidationError(
                {"created_to": "created_to must not be earlier than created_from."}
            )
        return attrs


class InventoryLedgerEntrySerializer(serializers.ModelSerializer):
    product_item_id = serializers.IntegerField(read_only=True)
    sku = serializers.CharField(source="product_item.sku", read_only=True)
    product_name = serializers.CharField(
        source="product_item.product.name",
        read_only=True,
    )
    order_id = serializers.IntegerField(read_only=True)
    order_code = serializers.CharField(source="order.order_code", read_only=True)
    actor_id = serializers.IntegerField(read_only=True)
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)

    class Meta:
        model = InventoryLedgerEntry
        fields = (
            "id",
            "product_item_id",
            "sku",
            "product_name",
            "order_id",
            "order_code",
            "actor_id",
            "actor_name",
            "reason",
            "quantity_change",
            "quantity_before",
            "quantity_after",
            "note",
            "created_at",
        )
        read_only_fields = fields
