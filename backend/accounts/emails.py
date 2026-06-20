from urllib.parse import urlencode

from django.conf import settings

from core.emailing import send_templated_email


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
