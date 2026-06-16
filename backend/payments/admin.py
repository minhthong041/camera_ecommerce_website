from django.contrib import admin

from .models import Payment, PaymentMethod, PaymentStatus


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description")
    search_fields = ("name",)


@admin.register(PaymentStatus)
class PaymentStatusAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "payment_method",
        "provider_transaction_id",
        "amount",
        "status",
        "created_at",
        "updated_at",
    )
    list_filter = ("payment_method", "status", "created_at")
    search_fields = ("order__order_code", "provider_transaction_id")
    list_select_related = ("order", "payment_method", "status")
    readonly_fields = ("created_at", "updated_at")
