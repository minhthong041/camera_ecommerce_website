from django.db import transaction

from core.emailing import send_templated_email

from .models import Order, ReturnRequest


def send_order_status_email(order_id, event):
    order = (
        Order.objects.select_related("user", "status")
        .prefetch_related("lines__product_item__product")
        .get(pk=order_id)
    )
    return send_templated_email(
        subject=f"CameraShop order {order.order_code}: {order.status.name}",
        recipient=order.user.email,
        template_name="order_status",
        context={"order": order, "event": event, "lines": order.lines.all()},
    )


def schedule_order_status_email(order_id, event="status_updated"):
    transaction.on_commit(lambda: send_order_status_email(order_id, event))


def send_return_status_email(return_request_id):
    return_request = ReturnRequest.objects.select_related(
        "user",
        "order",
        "status",
    ).get(pk=return_request_id)
    return send_templated_email(
        subject=f"CameraShop return request for {return_request.order.order_code}",
        recipient=return_request.user.email,
        template_name="return_status",
        context={"return_request": return_request},
    )


def schedule_return_status_email(return_request_id):
    transaction.on_commit(lambda: send_return_status_email(return_request_id))
