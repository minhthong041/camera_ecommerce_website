import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.db.models import F, Q


def create_opening_balances(apps, schema_editor):
    ProductItem = apps.get_model("catalog", "ProductItem")
    InventoryLedgerEntry = apps.get_model("inventory", "InventoryLedgerEntry")

    InventoryLedgerEntry.objects.bulk_create(
        [
            InventoryLedgerEntry(
                product_item_id=product_item.pk,
                reason="initial_stock",
                quantity_change=product_item.qty_in_stock,
                quantity_before=0,
                quantity_after=product_item.qty_in_stock,
                idempotency_key=(
                    f"product-item:{product_item.pk}:initial-stock"
                ),
                note="Opening balance created by inventory ledger migration.",
            )
            for product_item in ProductItem.objects.filter(qty_in_stock__gt=0)
        ],
        batch_size=1000,
    )


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("catalog", "0002_alter_brand_options_alter_category_options_and_more"),
        ("orders", "0003_returnrequest"),
    ]

    operations = [
        migrations.CreateModel(
            name="InventoryLedgerEntry",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "reason",
                    models.CharField(
                        choices=[
                            ("initial_stock", "Initial stock"),
                            ("manual_adjustment", "Manual adjustment"),
                            ("checkout", "Checkout"),
                            ("order_cancelled", "Order cancelled"),
                            ("payment_failed", "Payment failed"),
                            ("return_approved", "Return approved"),
                            ("order_refunded", "Order refunded"),
                        ],
                        db_index=True,
                        max_length=40,
                    ),
                ),
                ("quantity_change", models.IntegerField()),
                ("quantity_before", models.PositiveIntegerField()),
                ("quantity_after", models.PositiveIntegerField()),
                (
                    "idempotency_key",
                    models.CharField(
                        blank=True,
                        max_length=255,
                        null=True,
                        unique=True,
                    ),
                ),
                ("note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="inventory_ledger_entries",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "order",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="inventory_ledger_entries",
                        to="orders.order",
                    ),
                ),
                (
                    "product_item",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="inventory_ledger_entries",
                        to="catalog.productitem",
                    ),
                ),
            ],
            options={
                "db_table": "inventory_ledger_entries",
                "ordering": ("-created_at", "-id"),
                "indexes": [
                    models.Index(
                        fields=["product_item", "-created_at"],
                        name="inventory_item_created_idx",
                    ),
                    models.Index(
                        fields=["order", "reason"],
                        name="inventory_order_reason_idx",
                    ),
                ],
                "constraints": [
                    models.CheckConstraint(
                        condition=~Q(quantity_change=0),
                        name="inventory_ledger_quantity_change_nonzero",
                    ),
                    models.CheckConstraint(
                        condition=Q(
                            quantity_after=F("quantity_before")
                            + F("quantity_change")
                        ),
                        name="inventory_ledger_balances_match",
                    ),
                ],
            },
        ),
        migrations.RunPython(
            create_opening_balances,
            migrations.RunPython.noop,
        ),
    ]
