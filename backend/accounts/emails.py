from urllib.parse import urlencode

from django.conf import settings
from django.db import transaction

from core.emailing import send_templated_email

from .models import User


def send_registration_email(user):
    return send_templated_email(
        subject="Welcome to CameraShop",
        recipient=user.email,
        template_name="registration_success",
        context={
            "user": user,
            "login_url": f"{settings.FRONTEND_BASE_URL.rstrip('/')}/login",
        },
    )


def schedule_registration_email(user_id):
    def deliver():
        user = User.objects.filter(pk=user_id, is_active=True).first()
        if user:
            send_registration_email(user)

    transaction.on_commit(deliver)


def send_password_reset_email(user, token):
    query = urlencode({"email": user.email, "token": token})
    reset_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password?{query}"
    return send_templated_email(
        subject="Reset your CameraShop password",
        recipient=user.email,
        template_name="password_reset",
        context={"user": user, "reset_url": reset_url},
    )


def send_email_otp(destination, otp):
    return send_templated_email(
        subject="Your CameraShop verification code",
        recipient=destination,
        template_name="verification_code",
        context={"otp": otp, "expires_minutes": 5},
    )
