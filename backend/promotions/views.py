from cart.models import CartItem
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ApplyPromotionSerializer
from .services import PromotionLine, PromotionRuleError, quote_promotion


class ApplyPromotionView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        serializer = ApplyPromotionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart_items = list(
            CartItem.objects.filter(cart__user=request.user)
            .select_related("product_item__product")
            .order_by("id")
        )
        if not cart_items:
            raise ValidationError({"cart": "Shopping cart is empty."})

        lines = tuple(
            PromotionLine(
                category_id=item.product_item.product.category_id,
                unit_price=item.product_item.price,
                quantity=item.quantity,
            )
            for item in cart_items
        )

        try:
            quote = quote_promotion(
                code=serializer.validated_data["code"],
                user=request.user,
                lines=lines,
            )
        except PromotionRuleError as exc:
            raise ValidationError({"code": [exc.message]}) from exc

        if serializer.validated_data["cart_total"] != quote.subtotal:
            raise ValidationError(
                {
                    "cart_total": [
                        "Cart total does not match the current cart subtotal."
                    ]
                }
            )

        return Response(
            {
                "promotion_id": quote.promotion.id,
                "code": quote.promotion.code,
                "subtotal": str(quote.subtotal),
                "eligible_subtotal": str(quote.eligible_subtotal),
                "discount_amount": str(quote.discount_amount),
                "final_total": str(quote.final_subtotal),
                "is_exclusive": quote.promotion.is_exclusive,
            }
        )
