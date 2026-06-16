from django.contrib import admin

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
