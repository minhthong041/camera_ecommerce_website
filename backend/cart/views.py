from django.db import transaction
from django.db.models import Prefetch
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from catalog.models import ProductItem

from .models import CartItem, ShoppingCart
from .serializers import CartItemSerializer, ShoppingCartSerializer


def cart_items_queryset():
    return (
        CartItem.objects.select_related(
            "product_item",
            "product_item__product",
        )
        .order_by("id")
    )


class ShoppingCartViewSet(viewsets.GenericViewSet):
    serializer_class = ShoppingCartSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            ShoppingCart.objects.filter(user=self.request.user)
            .select_related("user")
            .prefetch_related(Prefetch("items", queryset=cart_items_queryset()))
        )

    def list(self, request, *args, **kwargs):
        cart, _ = ShoppingCart.objects.get_or_create(user=request.user)
        cart = self.get_queryset().get(pk=cart.pk)
        serializer = self.get_serializer(cart)
        return Response(serializer.data)


class CartItemViewSet(
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = CartItemSerializer
    permission_classes = (IsAuthenticated,)
    http_method_names = ("post", "patch", "delete", "head", "options")

    def get_queryset(self):
        return cart_items_queryset().filter(cart__user=self.request.user)

    def create(self, request, *args, **kwargs):
        cart, _ = ShoppingCart.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_item = serializer.validated_data["product_item"]
        quantity = serializer.validated_data["quantity"]

        with transaction.atomic():
            product_item = ProductItem.objects.select_for_update().get(
                pk=product_item.pk
            )
            cart_item = (
                CartItem.objects.select_for_update()
                .filter(cart=cart, product_item=product_item)
                .first()
            )

            if cart_item:
                new_quantity = cart_item.quantity + quantity
                update_serializer = self.get_serializer(
                    cart_item,
                    data={"quantity": new_quantity},
                    partial=True,
                )
                update_serializer.is_valid(raise_exception=True)
                update_serializer.save()
                return Response(update_serializer.data, status=status.HTTP_200_OK)

            serializer.save(cart=cart, product_item=product_item)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
