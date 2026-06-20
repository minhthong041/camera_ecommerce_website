from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Lower


class DiscountType(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "discount_types"
        verbose_name = "discount_type"
        verbose_name_plural = "discount_types"

    def __str__(self):
        return self.name


class Promotion(models.Model):
    code = models.CharField(max_length=100, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255)
    discount_type = models.ForeignKey(
        DiscountType,
        on_delete=models.PROTECT,
        related_name="promotions",
    )
    discount_value = models.DecimalField(max_digits=15, decimal_places=2)
    min_order_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        default=0,
    )
    max_discount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
    )
    start_date = models.DateTimeField(db_index=True)
    end_date = models.DateTimeField(db_index=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    is_exclusive = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "promotions"
        verbose_name = "promotion"
        verbose_name_plural = "promotions"
        constraints = [
            models.UniqueConstraint(
                Lower("code"),
                condition=Q(code__isnull=False),
                name="promotions_code_case_insensitive_unique",
            ),
            models.CheckConstraint(
                condition=Q(end_date__gt=F("start_date")),
                name="promotions_end_after_start",
            ),
            models.CheckConstraint(
                condition=Q(discount_value__gt=0),
                name="promotions_discount_value_positive",
            ),
            models.CheckConstraint(
                condition=Q(min_order_value__isnull=True)
                | Q(min_order_value__gte=0),
                name="promotions_min_order_value_non_negative",
            ),
            models.CheckConstraint(
                condition=Q(max_discount__isnull=True) | Q(max_discount__gt=0),
                name="promotions_max_discount_positive",
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.code = (
            self.code.strip().upper() if self.code and self.code.strip() else None
        )
        super().save(*args, **kwargs)


class PromotionCategory(models.Model):
    promotion = models.ForeignKey(
        Promotion,
        on_delete=models.CASCADE,
        related_name="promotion_categories",
    )
    category = models.ForeignKey(
        "catalog.Category",
        on_delete=models.CASCADE,
        related_name="promotion_categories",
    )

    class Meta:
        db_table = "promotion_categories"
        verbose_name = "promotion_category"
        verbose_name_plural = "promotion_categories"
        constraints = [
            models.UniqueConstraint(
                fields=["promotion", "category"],
                name="promotion_categories_promotion_category_unique",
            ),
        ]

    def __str__(self):
        return f"{self.promotion} - {self.category}"


class PromotionUser(models.Model):
    promotion = models.ForeignKey(
        Promotion,
        on_delete=models.CASCADE,
        related_name="promotion_users",
    )
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="promotion_users",
    )

    class Meta:
        db_table = "promotion_users"
        verbose_name = "promotion_user"
        verbose_name_plural = "promotion_users"
        constraints = [
            models.UniqueConstraint(
                fields=["promotion", "user"],
                name="promotion_users_promotion_user_unique",
            ),
        ]

    def __str__(self):
        return f"{self.promotion} - {self.user}"
