from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import WishlistItem
from .serializers import UserFavoriteSerializer, WishlistListSerializer


class WishlistView(generics.ListCreateAPIView):
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            WishlistItem.objects.filter(user_id=self.request.user.id)
            .select_related("product_item", "product_item__product")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.request.method == "GET":
            return WishlistListSerializer
        return UserFavoriteSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_item = serializer.validated_data["product_item"]

        try:
            with transaction.atomic():
                favorite, created = WishlistItem.objects.get_or_create(
                    user=request.user,
                    product_item=product_item,
                )
        except IntegrityError:
            favorite = get_object_or_404(
                WishlistItem,
                user=request.user,
                product_item=product_item,
            )
            created = False

        response_serializer = WishlistListSerializer(favorite)
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(response_serializer.data, status=response_status)


class WishlistDetailView(generics.DestroyAPIView):
    serializer_class = WishlistListSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return WishlistItem.objects.filter(
            user_id=self.request.user.id,
        ).select_related("product_item", "product_item__product")

    def get_object(self):
        return get_object_or_404(
            self.get_queryset(),
            product_item_id=self.kwargs["product_item_id"],
        )
