from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Role, User


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    readonly_fields = ("id", "last_login", "date_joined")
    actions = ("deactivate_selected_users",)

    list_display = (
        "id",
        "full_name",
        "username",
        "email",
        "phone_number",
        "role",
        "date_joined",
        "is_staff",
        "is_active",
    )

    search_fields = (
        "username",
        "email",
        "full_name",
        "phone_number",
    )

    list_filter = (
        "role",
        "is_staff",
        "is_active",
    )

    fieldsets = (
        (
            "Account",
            {
                "fields": (
                    "id",
                    "username",
                    "password",
                )
            },
        ),
        (
            "Customer information",
            {
                "fields": (
                    "full_name",
                    "email",
                    "phone_number",
                    "dob",
                    "role",
                )
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Important dates",
            {
                "fields": (
                    "last_login",
                    "date_joined",
                )
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "password1",
                    "password2",
                ),
            },
        ),
        (
            "Customer information",
            {
                "fields": (
                    "email",
                    "full_name",
                    "phone_number",
                    "dob",
                    "role",
                )
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
    )

    @admin.action(description="Deactivate selected users and release identifiers")
    def deactivate_selected_users(self, request, queryset):
        for user in queryset:
            user.deactivate_account()
