from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from catalog.models import Product, ProductItem
from inventory.services import InventoryError, adjust_stock, record_initial_stock
from orders.models import ShippingMethod
from payments.models import PaymentMethod
from promotions.models import Promotion

from .permissions import IsAdminRole, IsStaffRole
from .serializers import (
    AdminPaymentMethodSerializer,
    AdminProductItemSerializer,
    AdminProductSerializer,
    AdminPromotionSerializer,
    AdminShippingMethodSerializer,
    StockUpdateSerializer,
)


DELETE_CONFLICT_MESSAGE = (
    "Không thể xóa dữ liệu này vì đang được sử dụng ở các bản ghi khác."
)


class SafeDestroyModelViewSet(ModelViewSet):
    permission_classes = (IsAuthenticated, IsAdminRole | IsStaffRole)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            with transaction.atomic():
                self.perform_destroy(instance)
        except IntegrityError:
            return Response(
                {"detail": DELETE_CONFLICT_MESSAGE},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductViewSet(SafeDestroyModelViewSet):
    serializer_class = AdminProductSerializer

    def get_queryset(self):
        return Product.objects.select_related("brand", "category").order_by("name")


class ProductItemViewSet(SafeDestroyModelViewSet):
    serializer_class = AdminProductItemSerializer

    def get_queryset(self):
        return ProductItem.objects.select_related(
            "product",
            "product__brand",
            "product__category",
        ).order_by("sku")

    def perform_create(self, serializer):
        with transaction.atomic():
            product_item = serializer.save()
            record_initial_stock(
                product_item=product_item,
                actor=self.request.user,
            )

    @action(detail=True, methods=("patch",), url_path="stock")
    def update_stock(self, request, pk=None):
        serializer = StockUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_item = self.get_object()
        try:
            product_item, _ = adjust_stock(
                product_item_id=product_item.pk,
                new_quantity=serializer.validated_data["qty_in_stock"],
                actor=request.user,
                note=serializer.validated_data.get("note", ""),
            )
        except InventoryError as exc:
            raise ValidationError({"qty_in_stock": exc.message}) from exc

        return Response(
            self.get_serializer(product_item).data,
            status=status.HTTP_200_OK,
        )


class PromotionViewSet(SafeDestroyModelViewSet):
    serializer_class = AdminPromotionSerializer

    def get_queryset(self):
        return (
            Promotion.objects.select_related("discount_type")
            .prefetch_related("promotion_categories", "promotion_users")
            .order_by("-start_date", "code")
        )


class PaymentMethodViewSet(SafeDestroyModelViewSet):
    queryset = PaymentMethod.objects.order_by("name")
    serializer_class = AdminPaymentMethodSerializer


class ShippingMethodViewSet(SafeDestroyModelViewSet):
    queryset = ShippingMethod.objects.order_by("name")
    serializer_class = AdminShippingMethodSerializer
