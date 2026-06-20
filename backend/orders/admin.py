from django.contrib import admin

from .models import (
    Order,
    OrderLine,
    OrderStatus,
    ReturnRequest,
    ReturnRequestStatus,
    ShippingMethod,
)


@admin.register(ShippingMethod)
class ShippingMethodAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "price")
    search_fields = ("name",)


@admin.register(OrderStatus)
class OrderStatusAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order_code",
        "user",
        "shipping_method",
        "promotion",
        "total_amount",
        "status",
        "created_at",
    )
    list_filter = ("status", "shipping_method", "created_at")
    search_fields = ("order_code", "user__username", "user__email", "user__phone_number")
    list_select_related = ("user", "shipping_method", "shipping_address", "promotion", "status")
    readonly_fields = ("created_at",)


@admin.register(OrderLine)
class OrderLineAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "product_item", "price", "quantity")
    search_fields = ("order__order_code", "product_item__sku", "product_item__product__name")
    list_select_related = ("order", "product_item")


@admin.register(ReturnRequestStatus)
class ReturnRequestStatusAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(ReturnRequest)
class ReturnRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "user", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("order__order_code", "user__username", "user__email")
    list_select_related = ("order", "user", "status")
    readonly_fields = ("created_at",)
