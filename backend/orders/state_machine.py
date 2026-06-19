PENDING = "pending"
CONFIRMED = "confirmed"
PROCESSING = "processing"
SHIPPING = "shipping"
DELIVERED = "delivered"
CANCELLED = "cancelled"
REFUNDED = "refunded"


CUSTOMER_CANCELLABLE_STATUSES = frozenset({PENDING, CONFIRMED})
RESTOCKED_ORDER_STATUSES = frozenset({CANCELLED, REFUNDED})
PAYMENT_OPEN_ORDER_STATUSES = frozenset({PENDING, CONFIRMED})

ADMIN_ORDER_TRANSITIONS = {
    PENDING: frozenset({CONFIRMED, CANCELLED}),
    CONFIRMED: frozenset({PROCESSING, CANCELLED}),
    PROCESSING: frozenset({SHIPPING, CANCELLED}),
    SHIPPING: frozenset({DELIVERED}),
    DELIVERED: frozenset({REFUNDED}),
    CANCELLED: frozenset(),
    REFUNDED: frozenset(),
}


def normalize_status_name(value):
    return value.strip().lower()


def allowed_admin_transitions(current_status):
    current = normalize_status_name(current_status)
    return ADMIN_ORDER_TRANSITIONS.get(current, frozenset())


def is_admin_transition_allowed(current_status, target_status):
    current = normalize_status_name(current_status)
    target = normalize_status_name(target_status)
    return current == target or target in allowed_admin_transitions(current)


def payment_order_target(current_status, *, succeeded):
    current = normalize_status_name(current_status)
    if current not in PAYMENT_OPEN_ORDER_STATUSES:
        return current
    return PROCESSING if succeeded else CANCELLED


def payment_failure_restores_stock(current_status):
    return normalize_status_name(current_status) in PAYMENT_OPEN_ORDER_STATUSES


def payment_success_requires_refund(current_status):
    return normalize_status_name(current_status) in RESTOCKED_ORDER_STATUSES
