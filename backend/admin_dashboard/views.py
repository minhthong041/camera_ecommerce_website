from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from accounts.models import User
from catalog.models import Brand, Category, Product, ProductItem
from inventory.services import InventoryError, adjust_stock, record_initial_stock
from orders.models import Order, ShippingMethod
from payments.models import Payment, PaymentMethod
from promotions.models import DiscountType, Promotion

from .permissions import IsAdminRole, IsStaffRole
from .serializers import (
    AdminPaymentMethodSerializer,
    AdminBrandSerializer,
    AdminCategorySerializer,
    AdminDiscountTypeSerializer,
    AdminProductItemSerializer,
    AdminProductSerializer,
    AdminPromotionSerializer,
    AdminShippingMethodSerializer,
    CustomerAccountSerializer,
    EmployeeAccountSerializer,
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


class BrandViewSet(SafeDestroyModelViewSet):
    serializer_class = AdminBrandSerializer
    queryset = Brand.objects.order_by("name")


class CategoryViewSet(SafeDestroyModelViewSet):
    serializer_class = AdminCategorySerializer

    def get_queryset(self):
        return Category.objects.select_related("parent").order_by("name")


class CustomerAccountViewSet(ModelViewSet):
    serializer_class = CustomerAccountSerializer
    permission_classes = (IsAuthenticated, IsAdminRole | IsStaffRole)
    http_method_names = ("get", "post", "patch", "head", "options")

    def get_queryset(self):
        return User.objects.select_related("role").filter(
            role__name__iexact="customer"
        ).order_by("-date_joined", "-id")


class EmployeeAccountViewSet(ModelViewSet):
    serializer_class = EmployeeAccountSerializer
    permission_classes = (IsAuthenticated, IsAdminRole)
    http_method_names = ("get", "post", "patch", "delete", "head", "options")

    def get_queryset(self):
        return User.objects.select_related("role").filter(
            role__name__iexact="staff"
        ).order_by("-date_joined", "-id")

    def perform_destroy(self, instance):
        instance.deactivate_account()


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
    permission_classes = (IsAuthenticated, IsAdminRole)

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


class BusinessStatisticsAPIView(APIView):
    permission_classes = (IsAuthenticated, IsAdminRole)

    def get(self, request, *args, **kwargs):
        today = timezone.localdate()
        paid_payments = Payment.objects.filter(
            Q(status__name__iexact="paid")
            | Q(status__name__iexact="completed")
        )
        revenue = paid_payments.aggregate(total=Sum("amount"))["total"] or Decimal("0")
        revenue_today = (
            paid_payments.filter(created_at__date=today).aggregate(total=Sum("amount"))[
                "total"
            ]
            or Decimal("0")
        )
        order_status_counts = {
            row["status__name"]: row["count"]
            for row in Order.objects.values("status__name").annotate(count=Count("id"))
        }

        return Response(
            {
                "customers": User.objects.filter(
                    role__name__iexact="customer"
                ).count(),
                "active_customers": User.objects.filter(
                    role__name__iexact="customer",
                    is_active=True,
                ).count(),
                "employees": User.objects.filter(role__name__iexact="staff").count(),
                "active_products": Product.objects.filter(is_active=True).count(),
                "low_stock_items": ProductItem.objects.filter(qty_in_stock__lte=5).count(),
                "orders": Order.objects.count(),
                "orders_today": Order.objects.filter(created_at__date=today).count(),
                "revenue": revenue,
                "revenue_today": revenue_today,
                "order_status_counts": order_status_counts,
            }
        )


class DiscountTypeViewSet(SafeDestroyModelViewSet):
    serializer_class = AdminDiscountTypeSerializer
    permission_classes = (IsAuthenticated, IsAdminRole)
    queryset = DiscountType.objects.order_by("name")
