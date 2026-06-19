from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="test@example.com",
)
class AccountSecurityAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="security-user",
            email="security@example.com",
            phone_number="0900000001",
            full_name="Security User",
            password="CurrentPassword123!",
        )
        cls.inactive_user = User.objects.create_user(
            username="inactive-user",
            email="inactive@example.com",
            phone_number="0900000002",
            full_name="Inactive User",
            password="CurrentPassword123!",
            is_active=False,
        )
        cls.other_user = User.objects.create_user(
            username="other-user",
            email="other@example.com",
            phone_number="0900000003",
            full_name="Other User",
            password="CurrentPassword123!",
        )

    def setUp(self):
        self.client = APIClient()
        cache.clear()
        mail.outbox.clear()

    def authenticate_user(self):
        self.client.force_authenticate(user=self.user)

    def request_password_reset_token(self):
        response = self.client.post(
            "/api/auth/password-reset/",
            {"email": self.user.email},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        return mail.outbox[0].body.strip().splitlines()[-1]

    def test_change_password_requires_correct_old_password(self):
        self.authenticate_user()

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "old_password": "WrongPassword123!",
                "new_password": "NewStrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            str(response.data["old_password"][0]),
            "Incorrect old password.",
        )

    def test_change_password_hashes_and_saves_new_password(self):
        self.authenticate_user()

        response = self.client.post(
            "/api/auth/change-password/",
            {
                "old_password": "CurrentPassword123!",
                "new_password": "NewStrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewStrongPassword123!"))
        self.assertFalse(self.user.check_password("CurrentPassword123!"))

    def test_change_password_requires_authentication(self):
        response = self.client.post(
            "/api/auth/change-password/",
            {
                "old_password": "CurrentPassword123!",
                "new_password": "NewStrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    def test_profile_update_does_not_allow_username_changes(self):
        self.authenticate_user()

        response = self.client.patch(
            "/api/auth/profile/",
            {
                "username": "changed-username",
                "full_name": "Updated Security User",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "security-user")
        self.assertEqual(self.user.full_name, "Updated Security User")
        self.assertEqual(response.data["username"], "security-user")

    def test_password_reset_request_sends_token_by_email(self):
        response = self.client.post(
            "/api/auth/password-reset/",
            {"email": "SECURITY@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])
        self.assertNotIn("token", response.data)

    def test_password_reset_rejects_unknown_or_inactive_account(self):
        for email in ("missing@example.com", self.inactive_user.email):
            with self.subTest(email=email):
                response = self.client.post(
                    "/api/auth/password-reset/",
                    {"email": email},
                    format="json",
                )
                self.assertEqual(response.status_code, 400)

    def test_password_reset_confirm_changes_password_and_revokes_refresh_tokens(self):
        refresh = RefreshToken.for_user(self.user)
        outstanding = OutstandingToken.objects.get(jti=refresh["jti"])
        token = self.request_password_reset_token()

        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "email": self.user.email,
                "token": token,
                "new_password": "ResetPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("ResetPassword123!"))
        self.assertTrue(
            BlacklistedToken.objects.filter(token=outstanding).exists()
        )

        reused_response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "email": self.user.email,
                "token": token,
                "new_password": "AnotherPassword123!",
            },
            format="json",
        )
        self.assertEqual(reused_response.status_code, 400)

    def test_password_reset_confirm_rejects_invalid_token(self):
        response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "email": self.user.email,
                "token": "invalid-token",
                "new_password": "ResetPassword123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            str(response.data["token"][0]),
            "Invalid or expired token.",
        )

    @patch("accounts.views.secrets.randbelow", return_value=12345)
    def test_email_otp_is_cached_verified_once_and_not_returned(self, randbelow):
        request_response = self.client.post(
            "/api/auth/otp/request/",
            {"email": "SECURITY@example.com"},
            format="json",
        )

        self.assertEqual(request_response.status_code, 200)
        self.assertNotIn("otp", request_response.data)
        self.assertEqual(cache.get("otp_security@example.com"), "012345")
        self.assertEqual(len(mail.outbox), 1)

        invalid_response = self.client.post(
            "/api/auth/otp/verify/",
            {"email": self.user.email, "otp": "999999"},
            format="json",
        )
        self.assertEqual(invalid_response.status_code, 400)
        self.assertEqual(cache.get("otp_security@example.com"), "012345")

        valid_response = self.client.post(
            "/api/auth/otp/verify/",
            {"email": self.user.email, "otp": "012345"},
            format="json",
        )
        self.assertEqual(valid_response.status_code, 200)
        self.assertIsNone(cache.get("otp_security@example.com"))
        self.assertTrue(cache.get("otp_verified_security@example.com"))

        reused_response = self.client.post(
            "/api/auth/otp/verify/",
            {"email": self.user.email, "otp": "012345"},
            format="json",
        )
        self.assertEqual(reused_response.status_code, 400)

    @patch("accounts.views.logger.info")
    @patch("accounts.views.secrets.randbelow", return_value=654321)
    def test_phone_otp_is_sent_to_development_log(self, randbelow, log_info):
        response = self.client.post(
            "/api/auth/otp/request/",
            {"phone_number": self.user.phone_number},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(cache.get("otp_0900000001"), "654321")
        log_info.assert_called_once()

    def test_otp_requires_exactly_one_identifier(self):
        both_response = self.client.post(
            "/api/auth/otp/request/",
            {
                "email": self.user.email,
                "phone_number": self.user.phone_number,
            },
            format="json",
        )
        empty_response = self.client.post(
            "/api/auth/otp/request/",
            {},
            format="json",
        )

        self.assertEqual(both_response.status_code, 400)
        self.assertEqual(empty_response.status_code, 400)

    def test_logout_all_blacklists_only_active_tokens_for_current_user(self):
        active_refresh = RefreshToken.for_user(self.user)
        already_blacklisted_refresh = RefreshToken.for_user(self.user)
        expired_refresh = RefreshToken.for_user(self.user)
        other_user_refresh = RefreshToken.for_user(self.other_user)

        already_blacklisted_refresh.blacklist()
        expired_outstanding = OutstandingToken.objects.get(
            jti=expired_refresh["jti"]
        )
        expired_outstanding.expires_at = timezone.now() - timedelta(minutes=1)
        expired_outstanding.save(update_fields=("expires_at",))
        self.authenticate_user()

        response = self.client.post("/api/auth/logout-all/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["blacklisted_tokens"], 1)
        self.assertTrue(
            BlacklistedToken.objects.filter(
                token__jti=active_refresh["jti"]
            ).exists()
        )
        self.assertFalse(
            BlacklistedToken.objects.filter(
                token__jti=expired_refresh["jti"]
            ).exists()
        )
        self.assertFalse(
            BlacklistedToken.objects.filter(
                token__jti=other_user_refresh["jti"]
            ).exists()
        )

    def test_logout_all_requires_authentication(self):
        response = self.client.post("/api/auth/logout-all/", {}, format="json")

        self.assertEqual(response.status_code, 401)
