from django.contrib import admin

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "product_item", "order_line", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("user__username", "user__email", "product_item__sku", "product_item__product__name")
    list_select_related = ("user", "product_item", "order_line")
    readonly_fields = ("created_at",)
