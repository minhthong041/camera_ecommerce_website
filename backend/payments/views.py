from django.db import IntegrityError
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Payment, PaymentMethod, PaymentStatus
from .serializers import (
    PaymentMethodSerializer,
    PaymentSerializer,
    PaymentStatusSerializer,
    PaymentUpdateSerializer,
)


class PaymentMethodListView(generics.ListAPIView):
    queryset = PaymentMethod.objects.order_by("id")
    serializer_class = PaymentMethodSerializer
    permission_classes = (AllowAny,)


class PaymentStatusListView(generics.ListAPIView):
    queryset = PaymentStatus.objects.order_by("id")
    serializer_class = PaymentStatusSerializer
    permission_classes = (AllowAny,)


class PaymentCreateView(generics.CreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return Payment.objects.filter(order__user=self.request.user).select_related(
            "order",
            "payment_method",
            "status",
        )

    def perform_create(self, serializer):
        pending_status = PaymentStatus.objects.filter(name__iexact="pending").first()
        if pending_status is None:
            raise ValidationError(
                {"status": "Pending payment status is not configured."}
            )
        serializer.save(status=pending_status)


class PaymentDetailView(generics.UpdateAPIView):
    serializer_class = PaymentUpdateSerializer
    permission_classes = (IsAuthenticated,)
    http_method_names = ("patch", "head", "options")

    def get_queryset(self):
        return Payment.objects.filter(order__user=self.request.user).select_related(
            "order",
            "payment_method",
            "status",
        )

    def patch(self, request, *args, **kwargs):
        try:
            return super().patch(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {
                    "provider_transaction_id": [
                        "This provider transaction has already been recorded."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
