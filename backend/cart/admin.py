from django.contrib import admin

from .models import CartItem, ShoppingCart


@admin.register(ShoppingCart)
class ShoppingCartAdmin(admin.ModelAdmin):
    list_display = ("id", "user")
    search_fields = ("user__username", "user__email", "user__phone_number")
    list_select_related = ("user",)


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ("id", "cart", "product_item", "quantity")
    search_fields = ("cart__user__username", "product_item__sku", "product_item__product__name")
    list_select_related = ("cart", "product_item")
