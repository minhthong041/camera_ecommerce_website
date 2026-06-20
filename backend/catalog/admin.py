from django.contrib import admin

from inventory.models import InventoryLedgerEntry
from inventory.services import record_initial_stock

from .models import (
    Brand,
    Category,
    Product,
    ProductConfiguration,
    ProductItem,
    Variation,
    VariationOption,
)


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "logo_url")
    search_fields = ("name",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "parent")
    list_filter = ("parent",)
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")
    list_select_related = ("parent",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "brand", "category", "is_active")
    list_filter = ("is_active", "brand", "category")
    search_fields = ("name", "brand__name", "category__name")
    list_select_related = ("brand", "category")


@admin.register(ProductItem)
class ProductItemAdmin(admin.ModelAdmin):
    list_display = ("id", "sku", "product", "price", "qty_in_stock", "condition")
    list_filter = ("condition", "product__brand", "product__category")
    search_fields = ("sku", "product__name")
    list_select_related = ("product",)

    def save_model(self, request, obj, form, change):
        quantity_before = 0
        if change:
            quantity_before = ProductItem.objects.only("qty_in_stock").get(
                pk=obj.pk
            ).qty_in_stock

        super().save_model(request, obj, form, change)

        if not change:
            record_initial_stock(product_item=obj, actor=request.user)
            return

        quantity_change = obj.qty_in_stock - quantity_before
        if quantity_change:
            InventoryLedgerEntry.objects.create(
                product_item=obj,
                actor=request.user,
                reason=InventoryLedgerEntry.Reason.MANUAL_ADJUSTMENT,
                quantity_change=quantity_change,
                quantity_before=quantity_before,
                quantity_after=obj.qty_in_stock,
                note="Stock adjusted through Django admin.",
            )


@admin.register(Variation)
class VariationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "category")
    list_filter = ("category",)
    search_fields = ("name", "category__name")
    list_select_related = ("category",)


@admin.register(VariationOption)
class VariationOptionAdmin(admin.ModelAdmin):
    list_display = ("id", "variation", "value")
    list_filter = ("variation",)
    search_fields = ("variation__name", "value")
    list_select_related = ("variation",)


@admin.register(ProductConfiguration)
class ProductConfigurationAdmin(admin.ModelAdmin):
    list_display = ("product_item", "variation_option")
    search_fields = ("product_item__sku", "variation_option__value")
    list_select_related = ("product_item", "variation_option")
