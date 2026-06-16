from django.db import models


class ShoppingCart(models.Model):
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="shopping_cart",
    )

    class Meta:
        db_table = "shopping_carts"
        verbose_name = "shopping_cart"
        verbose_name_plural = "shopping_carts"

    def __str__(self):
        return f"Cart #{self.pk} - {self.user}"


class CartItem(models.Model):
    cart = models.ForeignKey(
        ShoppingCart,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product_item = models.ForeignKey(
        "catalog.ProductItem",
        on_delete=models.PROTECT,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "cart_items"
        verbose_name = "cart_item"
        verbose_name_plural = "cart_items"
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product_item"],
                name="cart_items_cart_product_item_unique",
            ),
        ]

    def __str__(self):
        return f"{self.cart} - {self.product_item}"
