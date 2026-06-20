from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from admin_dashboard.permissions import IsAdminRole, IsStaffRole

from .models import InventoryLedgerEntry
from .serializers import (
    InventoryLedgerEntrySerializer,
    InventoryLedgerFilterSerializer,
)


class InventoryLedgerPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


class InventoryLedgerListAPIView(ListAPIView):
    serializer_class = InventoryLedgerEntrySerializer
    permission_classes = (IsAuthenticated, IsAdminRole | IsStaffRole)
    pagination_class = InventoryLedgerPagination

    def get_queryset(self):
        queryset = InventoryLedgerEntry.objects.select_related(
            "product_item",
            "product_item__product",
            "order",
            "actor",
        )
        filter_serializer = InventoryLedgerFilterSerializer(
            data=self.request.query_params
        )
        filter_serializer.is_valid(raise_exception=True)
        filters = filter_serializer.validated_data

        if product_item_id := filters.get("product_item_id"):
            queryset = queryset.filter(product_item_id=product_item_id)
        if order_id := filters.get("order_id"):
            queryset = queryset.filter(order_id=order_id)
        if reason := filters.get("reason"):
            queryset = queryset.filter(reason=reason)
        if created_from := filters.get("created_from"):
            queryset = queryset.filter(created_at__gte=created_from)
        if created_to := filters.get("created_to"):
            queryset = queryset.filter(created_at__lte=created_to)

        return queryset.order_by("-created_at", "-id")
