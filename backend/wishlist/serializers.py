from rest_framework import serializers

from catalog.models import ProductItem

from .models import WishlistItem


class WishlistProductItemSerializer(serializers.ModelSerializer):
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


class UserFavoriteSerializer(serializers.ModelSerializer):
    product_item_id = serializers.PrimaryKeyRelatedField(
        source="product_item",
        queryset=ProductItem.objects.all(),
        write_only=True,
        error_messages={
            "does_not_exist": "Product item does not exist.",
            "incorrect_type": "product_item_id must be an integer.",
            "required": "product_item_id is required.",
        },
    )

    class Meta:
        model = WishlistItem
        fields = (
            "user_id",
            "product_item_id",
        )
        read_only_fields = ("user_id",)


class WishlistListSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    product_item_id = serializers.IntegerField(read_only=True)
    product_item = WishlistProductItemSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = (
            "user_id",
            "product_item_id",
            "product_item",
            "created_at",
        )
