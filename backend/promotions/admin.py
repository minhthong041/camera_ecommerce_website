from django.contrib import admin

from .models import DiscountType, Promotion, PromotionCategory, PromotionUser


@admin.register(DiscountType)
class DiscountTypeAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "code",
        "name",
        "discount_type",
        "discount_value",
        "start_date",
        "end_date",
        "usage_limit",
        "is_exclusive",
    )
    list_filter = ("discount_type", "is_exclusive", "start_date", "end_date")
    search_fields = ("code", "name")
    list_select_related = ("discount_type",)


@admin.register(PromotionCategory)
class PromotionCategoryAdmin(admin.ModelAdmin):
    list_display = ("promotion", "category")
    search_fields = ("promotion__code", "promotion__name", "category__name")
    list_select_related = ("promotion", "category")


@admin.register(PromotionUser)
class PromotionUserAdmin(admin.ModelAdmin):
    list_display = ("promotion", "user")
    search_fields = ("promotion__code", "promotion__name", "user__username", "user__email")
    list_select_related = ("promotion", "user")
