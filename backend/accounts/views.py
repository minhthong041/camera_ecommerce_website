import logging
import secrets

from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)

from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    OTPRequestSerializer,
    OTPVerifySerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserProfileSerializer,
    build_token_response,
    password_reset_token_generator,
)
from .emails import (
    schedule_registration_email,
    send_email_otp,
    send_password_reset_email,
)


logger = logging.getLogger(__name__)
OTP_TIMEOUT_SECONDS = 5 * 60
OTP_VERIFIED_TIMEOUT_SECONDS = 30 * 60


def otp_cache_key(identifier):
    return f"otp_{identifier}"


def send_otp_code(channel, destination, otp):
    if channel == "email":
        if not send_email_otp(destination, otp):
            raise RuntimeError("Unable to deliver verification email.")
        return

    # Replace this development log with an SMS provider in production.
    logger.info("Development phone OTP for %s: %s", destination, otp)


def blacklist_active_refresh_tokens(user):
    active_token_ids = list(
        OutstandingToken.objects.filter(
            user=user,
            expires_at__gt=timezone.now(),
        )
        .exclude(blacklistedtoken__isnull=False)
        .values_list("id", flat=True)
    )
    BlacklistedToken.objects.bulk_create(
        [BlacklistedToken(token_id=token_id) for token_id in active_token_ids],
        ignore_conflicts=True,
    )
    return len(active_token_ids)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (AllowAny,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        schedule_registration_email(user.pk)
        return Response(build_token_response(user), status=status.HTTP_201_CREATED)


class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(build_token_response(serializer.validated_data["user"]))


class LogoutView(generics.GenericAPIView):
    serializer_class = LogoutSerializer
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Logout successful."})


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user


class AccountView(APIView):
    permission_classes = (IsAuthenticated,)

    def delete(self, request, *args, **kwargs):
        request.user.deactivate_account()
        return Response({"detail": "Account deactivated successfully."})


class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password changed successfully."})


class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user
        if user is None:
            return Response(
                {"detail": "If the account exists, a password reset email was sent."}
            )
        token = password_reset_token_generator.make_token(user)

        try:
            if not send_password_reset_email(user, token):
                raise RuntimeError("Unable to deliver password reset email.")
        except Exception:
            logger.exception("Unable to send password reset email")
            return Response(
                {"detail": "Unable to send password reset email."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {"detail": "If the account exists, a password reset email was sent."}
        )


class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            user = serializer.save()
            # Password resets revoke every outstanding refresh token.
            blacklist_active_refresh_tokens(user)

        return Response({"detail": "Password reset successfully."})


class OTPRequestView(generics.GenericAPIView):
    serializer_class = OTPRequestSerializer
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["identifier"]
        channel = serializer.validated_data["channel"]
        otp = f"{secrets.randbelow(1_000_000):06d}"

        try:
            send_otp_code(channel, identifier, otp)
        except Exception:
            logger.exception("Unable to send OTP")
            return Response(
                {"detail": "Unable to send verification code."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        cache.set(otp_cache_key(identifier), otp, timeout=OTP_TIMEOUT_SECONDS)
        return Response({"detail": "Verification code sent."})


class OTPVerifyView(generics.GenericAPIView):
    serializer_class = OTPVerifySerializer
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["identifier"]
        submitted_otp = serializer.validated_data["otp"]
        cached_otp = cache.get(otp_cache_key(identifier))

        if cached_otp is None or not constant_time_compare(
            str(cached_otp),
            submitted_otp,
        ):
            return Response(
                {"otp": ["Invalid or expired OTP."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cache.delete(otp_cache_key(identifier))
        cache.set(
            f"otp_verified_{identifier}",
            True,
            timeout=OTP_VERIFIED_TIMEOUT_SECONDS,
        )
        return Response({"detail": "OTP verified successfully."})


class LogoutAllView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        # Blacklist all unexpired refresh tokens issued by SimpleJWT for this user.
        with transaction.atomic():
            blacklisted_count = blacklist_active_refresh_tokens(request.user)

        return Response(
            {
                "detail": "All devices logged out successfully.",
                "blacklisted_tokens": blacklisted_count,
            }
        )
