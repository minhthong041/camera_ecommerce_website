from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator


class Review(models.Model):
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="reviews",
    )
    product_item = models.ForeignKey(
        "catalog.ProductItem",
        on_delete=models.PROTECT,
        related_name="reviews",
    )
    order_line = models.OneToOneField(
        "orders.OrderLine",
        on_delete=models.PROTECT,
        related_name="review",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(5),
        ],
        db_index=True,
    )
    comment = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "reviews"
        verbose_name = "review"
        verbose_name_plural = "reviews"

    def __str__(self):
        return f"{self.product_item} - {self.rating}"
