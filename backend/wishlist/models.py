from django.db import models


class WishlistItem(models.Model):
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="wishlist_items",
    )
    product_item = models.ForeignKey(
        "catalog.ProductItem",
        on_delete=models.CASCADE,
        related_name="wishlist_items",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_favorites"
        verbose_name = "user_favorite"
        verbose_name_plural = "user_favorites"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product_item"],
                name="user_favorites_user_product_item_unique",
            ),
        ]

    def __str__(self):
        return f"{self.user} - {self.product_item}"
