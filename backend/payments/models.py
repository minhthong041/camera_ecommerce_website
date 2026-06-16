from django.db import models


class PaymentMethod(models.Model):
    name = models.CharField(max_length=50)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "payment_methods"
        verbose_name = "payment_method"
        verbose_name_plural = "payment_methods"

    def __str__(self):
        return self.name


class PaymentStatus(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "payment_statuses"
        verbose_name = "payment_status"
        verbose_name_plural = "payment_statuses"

    def __str__(self):
        return self.name


class Payment(models.Model):
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="payments",
    )
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    provider_transaction_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
    )
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.ForeignKey(
        PaymentStatus,
        on_delete=models.PROTECT,
        related_name="payments",
    )

    class Meta:
        db_table = "payments"
        verbose_name = "payment"
        verbose_name_plural = "payments"

    def __str__(self):
        return f"Payment #{self.pk} - {self.order}"
