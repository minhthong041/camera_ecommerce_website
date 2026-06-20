from collections import defaultdict
from dataclasses import dataclass

from django.db import transaction

from catalog.models import ProductItem

from .models import InventoryLedgerEntry


class InventoryError(Exception):
    def __init__(self, message):
        super().__init__(message)
        self.message = message


@dataclass(frozen=True)
class StockChange:
    product_item: ProductItem
    quantity_change: int
    reason: str
    order: object = None
    actor: object = None
    note: str = ""
    idempotency_key: str = None


def apply_locked_stock_changes(changes):
    changes = tuple(changes)
    if not changes:
        return []
    if not transaction.get_connection().in_atomic_block:
        raise InventoryError("Stock changes must run inside a database transaction.")

    idempotency_keys = {
        change.idempotency_key for change in changes if change.idempotency_key
    }
    existing_keys = set(
        InventoryLedgerEntry.objects.filter(
            idempotency_key__in=idempotency_keys
        ).values_list("idempotency_key", flat=True)
    )

    entries = []
    changed_items = {}
    valid_reasons = InventoryLedgerEntry.Reason.values
    for change in changes:
        if change.idempotency_key in existing_keys:
            continue
        if change.quantity_change == 0:
            continue
        if change.reason not in valid_reasons:
            raise InventoryError(f"Unsupported inventory reason '{change.reason}'.")

        product_item = change.product_item
        quantity_before = product_item.qty_in_stock
        quantity_after = quantity_before + change.quantity_change
        if quantity_after < 0:
            raise InventoryError(
                f"SKU '{product_item.sku}' does not have enough stock."
            )

        product_item.qty_in_stock = quantity_after
        changed_items[product_item.pk] = product_item
        entries.append(
            InventoryLedgerEntry(
                product_item=product_item,
                order=change.order,
                actor=change.actor,
                reason=change.reason,
                quantity_change=change.quantity_change,
                quantity_before=quantity_before,
                quantity_after=quantity_after,
                idempotency_key=change.idempotency_key,
                note=change.note,
            )
        )

    if changed_items:
        ProductItem.objects.bulk_update(changed_items.values(), ("qty_in_stock",))
        InventoryLedgerEntry.objects.bulk_create(entries)
    return entries


def adjust_stock(*, product_item_id, new_quantity, actor, note=""):
    with transaction.atomic():
        try:
            product_item = ProductItem.objects.select_for_update().get(
                pk=product_item_id
            )
        except ProductItem.DoesNotExist as exc:
            raise InventoryError("Product item does not exist.") from exc

        entries = apply_locked_stock_changes(
            (
                StockChange(
                    product_item=product_item,
                    quantity_change=new_quantity - product_item.qty_in_stock,
                    reason=InventoryLedgerEntry.Reason.MANUAL_ADJUSTMENT,
                    actor=actor,
                    note=note,
                ),
            )
        )
        return product_item, entries[0] if entries else None


def record_initial_stock(*, product_item, actor=None):
    if product_item.qty_in_stock <= 0:
        return None
    return InventoryLedgerEntry.objects.create(
        product_item=product_item,
        actor=actor,
        reason=InventoryLedgerEntry.Reason.INITIAL_STOCK,
        quantity_change=product_item.qty_in_stock,
        quantity_before=0,
        quantity_after=product_item.qty_in_stock,
        idempotency_key=f"product-item:{product_item.pk}:initial-stock",
    )


def restore_order_stock(*, order, reason, actor=None, note=""):
    quantities_by_product_item = defaultdict(int)
    for product_item_id, quantity in order.lines.values_list(
        "product_item_id",
        "quantity",
    ):
        quantities_by_product_item[product_item_id] += quantity

    if not quantities_by_product_item:
        return []

    product_items = list(
        ProductItem.objects.select_for_update()
        .filter(pk__in=quantities_by_product_item)
        .order_by("pk")
    )
    if len(product_items) != len(quantities_by_product_item):
        raise InventoryError(
            "Could not restore stock because an order item no longer exists."
        )

    return apply_locked_stock_changes(
        StockChange(
            product_item=product_item,
            quantity_change=quantities_by_product_item[product_item.pk],
            reason=reason,
            order=order,
            actor=actor,
            note=note,
            idempotency_key=(
                f"order:{order.pk}:stock-restored:item:{product_item.pk}"
            ),
        )
        for product_item in product_items
    )
