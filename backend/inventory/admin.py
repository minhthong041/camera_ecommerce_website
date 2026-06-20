from django.contrib import admin

from .models import InventoryLedgerEntry


@admin.register(InventoryLedgerEntry)
class InventoryLedgerEntryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "product_item",
        "reason",
        "quantity_change",
        "quantity_before",
        "quantity_after",
        "order",
        "created_at",
    )
    list_filter = ("reason", "created_at")
    search_fields = ("product_item__sku", "order__order_code", "note")
    list_select_related = ("product_item", "order", "actor")
    readonly_fields = (
        "product_item",
        "order",
        "actor",
        "reason",
        "quantity_change",
        "quantity_before",
        "quantity_after",
        "idempotency_key",
        "note",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
