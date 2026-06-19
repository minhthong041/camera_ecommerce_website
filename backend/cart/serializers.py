from rest_framework import serializers

from catalog.models import ProductItem

from .models import CartItem, ShoppingCart


class ProductItemSummarySerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = ProductItem
        fields = (
            "id",
            "product_name",
            "sku",
            "price",
            "qty_in_stock",
            "condition",
            "product_image",
        )


class CartItemSerializer(serializers.ModelSerializer):
    product_item = ProductItemSummarySerializer(read_only=True)
    product_item_id = serializers.PrimaryKeyRelatedField(
        source="product_item",
        queryset=ProductItem.objects.select_related("product"),
        write_only=True,
    )
    quantity = serializers.IntegerField(min_value=1, required=False)

    class Meta:
        model = CartItem
        fields = (
            "id",
            "cart",
            "product_item",
            "product_item_id",
            "quantity",
        )
        read_only_fields = ("id", "cart", "product_item")

    def validate(self, attrs):
        if self.instance and "product_item" in attrs:
            raise serializers.ValidationError(
                {
                    "product_item_id": (
                        "Changing product_item is not allowed. Remove this item "
                        "and add another product item instead."
                    )
                }
            )

        product_item = attrs.get("product_item")
        if self.instance:
            product_item = product_item or self.instance.product_item

        quantity = attrs.get("quantity")
        if quantity is None:
            quantity = self.instance.quantity if self.instance else 1

        if product_item and quantity > product_item.qty_in_stock:
            raise serializers.ValidationError(
                {
                    "quantity": (
                        f"Requested quantity ({quantity}) is greater than "
                        f"available stock ({product_item.qty_in_stock})."
                    )
                }
            )

        attrs["quantity"] = quantity
        return attrs


class ShoppingCartSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    cart_items = CartItemSerializer(source="items", many=True, read_only=True)

    class Meta:
        model = ShoppingCart
        fields = (
            "id",
            "user_id",
            "cart_items",
        )
