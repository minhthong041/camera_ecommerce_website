import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


logger = logging.getLogger(__name__)


def send_templated_email(*, subject, recipient, template_name, context):
    if not recipient:
        return False

    text_body = render_to_string(f"emails/{template_name}.txt", context)
    html_body = render_to_string(f"emails/{template_name}.html", context)
    message = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=(recipient,),
    )
    message.attach_alternative(html_body, "text/html")

    try:
        return message.send(fail_silently=False) == 1
    except Exception:
        logger.exception("Unable to send email '%s' to %s", subject, recipient)
        return False
