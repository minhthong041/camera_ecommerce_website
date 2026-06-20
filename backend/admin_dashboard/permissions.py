from rest_framework.permissions import BasePermission


def get_role_name(user):
    if not user or not user.is_authenticated or user.role_id is None:
        return None

    return user.role.name.strip().lower()


class IsAdminRole(BasePermission):
    """Allow users whose related role is named ``admin``."""

    message = "Administrator role is required."

    def has_permission(self, request, view):
        return get_role_name(request.user) == "admin"


class IsStaffRole(BasePermission):
    """Allow staff to read and write resources, except through DELETE."""

    message = "Staff members are not allowed to delete resources."

    def has_permission(self, request, view):
        return (
            get_role_name(request.user) == "staff"
            and request.method != "DELETE"
        )

