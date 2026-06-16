from django.contrib import admin

from .models import WishlistItem


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "product_item", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username", "user__email", "product_item__sku", "product_item__product__name")
    list_select_related = ("user", "product_item")
    readonly_fields = ("created_at",)
