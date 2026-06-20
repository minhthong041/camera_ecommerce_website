from dataclasses import dataclass
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone

from orders.models import Order

from .models import Promotion


MONEY_QUANTIZER = Decimal("0.01")
PERCENTAGE_TYPES = {"percentage", "percent", "percent_off"}
FIXED_TYPES = {"fixed_amount", "fixed", "amount"}


class PromotionRuleError(Exception):
    def __init__(self, message):
        super().__init__(message)
        self.message = message


@dataclass(frozen=True)
class PromotionLine:
    category_id: int
    unit_price: Decimal
    quantity: int

    @property
    def total(self):
        return self.unit_price * self.quantity


@dataclass(frozen=True)
class PromotionQuote:
    promotion: Promotion
    subtotal: Decimal
    eligible_subtotal: Decimal
    discount_amount: Decimal

    @property
    def final_subtotal(self):
        return max(
            self.subtotal - self.discount_amount,
            Decimal("0.00"),
        ).quantize(MONEY_QUANTIZER)


def quote_promotion(*, code, user, lines, lock=False, now=None):
    normalized_code = (code or "").strip().upper()
    if not normalized_code:
        raise PromotionRuleError("Promotion code is required.")

    queryset = Promotion.objects.select_related("discount_type").prefetch_related(
        "promotion_categories",
        "promotion_users",
    )
    if lock:
        queryset = queryset.select_for_update()

    try:
        promotion = queryset.get(code__iexact=normalized_code)
    except Promotion.DoesNotExist as exc:
        raise PromotionRuleError("Promotion code does not exist.") from exc
    except Promotion.MultipleObjectsReturned as exc:
        raise PromotionRuleError("Promotion code configuration is ambiguous.") from exc

    current_time = now or timezone.now()
    if current_time < promotion.start_date:
        raise PromotionRuleError("Promotion code has not started yet.")
    if current_time > promotion.end_date:
        raise PromotionRuleError("Promotion code has expired.")

    promotion_user_ids = {
        relation.user_id for relation in promotion.promotion_users.all()
    }
    if promotion_user_ids and user.id not in promotion_user_ids:
        raise PromotionRuleError("Promotion code is not available for this user.")

    normalized_lines = tuple(lines)
    subtotal = sum(
        (line.total for line in normalized_lines),
        Decimal("0.00"),
    ).quantize(MONEY_QUANTIZER)
    minimum = promotion.min_order_value or Decimal("0.00")
    if subtotal < minimum:
        raise PromotionRuleError(
            f"Order subtotal is less than the minimum required ({minimum})."
        )

    category_ids = {
        relation.category_id for relation in promotion.promotion_categories.all()
    }
    eligible_subtotal = sum(
        (
            line.total
            for line in normalized_lines
            if not category_ids or line.category_id in category_ids
        ),
        Decimal("0.00"),
    ).quantize(MONEY_QUANTIZER)
    if category_ids and eligible_subtotal <= 0:
        raise PromotionRuleError(
            "Promotion code does not apply to any item in this cart."
        )

    if promotion.usage_limit is not None:
        consumed_count = (
            Order.objects.filter(promotion_id=promotion.id)
            .exclude(
                Q(status__name__iexact="cancelled")
                | Q(status__name__iexact="refunded")
            )
            .count()
        )
        if consumed_count >= promotion.usage_limit:
            raise PromotionRuleError("Promotion usage limit has been reached.")

    discount_type = promotion.discount_type.name.strip().lower()
    if discount_type in PERCENTAGE_TYPES:
        if promotion.discount_value > Decimal("100"):
            raise PromotionRuleError(
                "Percentage discount value cannot be greater than 100."
            )
        discount_amount = (
            eligible_subtotal * promotion.discount_value / Decimal("100")
        )
    elif discount_type in FIXED_TYPES:
        discount_amount = promotion.discount_value
    else:
        raise PromotionRuleError("Unsupported promotion discount type.")

    if promotion.max_discount is not None:
        discount_amount = min(discount_amount, promotion.max_discount)
    discount_amount = min(discount_amount, eligible_subtotal).quantize(
        MONEY_QUANTIZER
    )

    return PromotionQuote(
        promotion=promotion,
        subtotal=subtotal,
        eligible_subtotal=eligible_subtotal,
        discount_amount=discount_amount,
    )
