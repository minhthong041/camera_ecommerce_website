from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q


class InventoryLedgerEntry(models.Model):
    class Reason(models.TextChoices):
        INITIAL_STOCK = "initial_stock", "Initial stock"
        MANUAL_ADJUSTMENT = "manual_adjustment", "Manual adjustment"
        CHECKOUT = "checkout", "Checkout"
        ORDER_CANCELLED = "order_cancelled", "Order cancelled"
        PAYMENT_FAILED = "payment_failed", "Payment failed"
        RETURN_APPROVED = "return_approved", "Return approved"
        ORDER_REFUNDED = "order_refunded", "Order refunded"

    product_item = models.ForeignKey(
        "catalog.ProductItem",
        on_delete=models.PROTECT,
        related_name="inventory_ledger_entries",
    )
    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="inventory_ledger_entries",
        null=True,
        blank=True,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="inventory_ledger_entries",
        null=True,
        blank=True,
    )
    reason = models.CharField(max_length=40, choices=Reason.choices, db_index=True)
    quantity_change = models.IntegerField()
    quantity_before = models.PositiveIntegerField()
    quantity_after = models.PositiveIntegerField()
    idempotency_key = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "inventory_ledger_entries"
        ordering = ("-created_at", "-id")
        constraints = [
            models.CheckConstraint(
                condition=~Q(quantity_change=0),
                name="inventory_ledger_quantity_change_nonzero",
            ),
            models.CheckConstraint(
                condition=Q(
                    quantity_after=F("quantity_before") + F("quantity_change")
                ),
                name="inventory_ledger_balances_match",
            ),
        ]
        indexes = [
            models.Index(
                fields=("product_item", "-created_at"),
                name="inventory_item_created_idx",
            ),
            models.Index(
                fields=("order", "reason"),
                name="inventory_order_reason_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.product_item.sku}: {self.quantity_change:+d} "
            f"({self.quantity_before} -> {self.quantity_after})"
        )

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Inventory ledger entries are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Inventory ledger entries cannot be deleted.")
