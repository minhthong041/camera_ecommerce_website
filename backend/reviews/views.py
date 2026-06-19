from django.db import IntegrityError, transaction
from django.db.models import Avg
from rest_framework import mixins, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from .models import Review
from .serializers import ReviewReadSerializer, ReviewWriteSerializer


class ProductReviewPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class ProductReviewListAPIView(ListAPIView):
    serializer_class = ReviewReadSerializer
    permission_classes = (AllowAny,)
    pagination_class = ProductReviewPagination

    def get_queryset(self):
        return (
            Review.objects.filter(
                product_item__product_id=self.kwargs["product_id"]
            )
            .select_related(
                "user",
                "product_item",
                "product_item__product",
                "order_line",
            )
            .order_by("-created_at", "-id")
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        average_rating = queryset.aggregate(value=Avg("rating"))["value"]
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["average_rating"] = round(float(average_rating or 0), 2)
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "average_rating": round(float(average_rating or 0), 2),
                "results": serializer.data,
            }
        )


class ReviewViewSet(
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    GenericViewSet,
):
    serializer_class = ReviewWriteSerializer
    permission_classes = (IsAuthenticated,)
    http_method_names = ("post", "patch", "delete", "head", "options")

    def get_queryset(self):
        return (
            Review.objects.filter(user=self.request.user)
            .select_related(
                "user",
                "product_item",
                "product_item__product",
                "order_line",
                "order_line__order",
            )
            .order_by("-created_at", "-id")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                review = serializer.save(user=request.user)
        except IntegrityError:
            raise ValidationError(
                {"order_line_id": "This order line has already been reviewed."}
            )

        response_serializer = ReviewReadSerializer(
            review,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        review = self.get_object()
        serializer = self.get_serializer(
            review,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()

        response_serializer = ReviewReadSerializer(
            review,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)
