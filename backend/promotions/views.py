from decimal import Decimal

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ApplyPromotionSerializer


class ApplyPromotionView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        serializer = ApplyPromotionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        promotion = serializer.validated_data["promotion"]
        cart_total = serializer.validated_data["cart_total"]
        discount_amount = self.calculate_discount_amount(promotion, cart_total)
        final_total = max(cart_total - discount_amount, Decimal("0.00"))

        return Response(
            {
                "promotion_id": promotion.id,
                "code": promotion.code,
                "discount_amount": str(discount_amount),
                "final_total": str(final_total.quantize(Decimal("0.01"))),
            }
        )

    def calculate_discount_amount(self, promotion, cart_total):
        discount_type = promotion.discount_type.name.strip().lower()

        if discount_type in {"percentage", "percent", "percent_off"}:
            discount_amount = cart_total * promotion.discount_value / Decimal("100")
        elif discount_type in {"fixed_amount", "fixed", "amount"}:
            discount_amount = promotion.discount_value
        else:
            discount_amount = Decimal("0.00")

        if promotion.max_discount is not None:
            discount_amount = min(discount_amount, promotion.max_discount)

        return min(discount_amount, cart_total).quantize(Decimal("0.01"))
