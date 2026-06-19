from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.db.models import Q
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Role, User


password_reset_token_generator = PasswordResetTokenGenerator()


class UserProfileSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username"
            "full_name",
            "email",
            "phone_number",
            "dob",
            "role",
            "role_name",
            "date_joined",
            "last_login",
            "is_active",
        )
        read_only_fields = (
            "id",
            "username",
            "role",
            "role_name",
            "date_joined",
            "last_login",
            "is_active",
        )
        extra_kwargs = {
            "username": {"validators": [], "required": False, "allow_blank": True},
            "email": {"validators": [], "required": False, "allow_blank": True},
            "phone_number": {
                "validators": [],
                "required": False,
                "allow_blank": True,
            },
        }

    def validate(self, attrs):
        user = self.instance
        username = attrs.get("username", getattr(user, "username", None))
        email = attrs.get("email", getattr(user, "email", None))

        if not username and not email:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Please provide at least an email or username so the "
                        "account can be used for login."
                    )
                }
            )

        return attrs

    def validate_username(self, value):
        value = self._normalize_optional_string(value)
        if value and self._identifier_exists("username", value):
            raise serializers.ValidationError("This username is already in use.")
        return value

    def validate_email(self, value):
        value = self._normalize_optional_string(value)
        if value and self._identifier_exists("email", value):
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate_phone_number(self, value):
        value = self._normalize_optional_string(value)
        if value and self._identifier_exists("phone_number", value):
            raise serializers.ValidationError("This phone number is already in use.")
        return value

    def _identifier_exists(self, field_name, value):
        queryset = User.objects.filter(**{f"{field_name}__iexact": value})
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        return queryset.exists()

    @staticmethod
    def _normalize_optional_string(value):
        if value is None:
            return None
        value = value.strip()
        return value or None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "full_name",
            "email",
            "phone_number",
            "dob",
            "password",
            "password_confirm",
        )
        read_only_fields = ("id",)
        extra_kwargs = {
            "username": {"validators": [], "required": False, "allow_blank": True},
            "email": {
                "validators": [],
                "required": True,
                "allow_blank": False,
            },
            "phone_number": {
                "validators": [],
                "required": False,
                "allow_blank": True,
            },
        }

    def validate_username(self, value):
        value = UserProfileSerializer._normalize_optional_string(value)
        if value and User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value

    def validate_email(self, value):
        value = UserProfileSerializer._normalize_optional_string(value)
        if not value:
            raise serializers.ValidationError("Email is required.")
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate_phone_number(self, value):
        value = UserProfileSerializer._normalize_optional_string(value)
        if value and User.objects.filter(phone_number__iexact=value).exists():
            raise serializers.ValidationError("This phone number is already in use.")
        return value

    def validate(self, attrs):
        password = attrs.get("password")
        password_confirm = attrs.pop("password_confirm", None)

        if password != password_confirm:
            raise serializers.ValidationError(
                {"password_confirm": "Password confirmation does not match."}
            )

        user = User(
            username=attrs.get("username"),
            email=attrs.get("email"),
            full_name=attrs.get("full_name"),
            phone_number=attrs.get("phone_number"),
            dob=attrs.get("dob"),
        )
        validate_password(password, user=user)
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        customer_role = Role.objects.filter(name__iexact="customer").first()

        user = User(**validated_data)
        if customer_role:
            user.role = customer_role
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(required=False, write_only=True)
    email = serializers.CharField(required=False, write_only=True)
    username = serializers.CharField(required=False, write_only=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        identifier = (
            attrs.get("identifier") or attrs.get("email") or attrs.get("username")
        )
        password = attrs.get("password")

        if not identifier:
            raise serializers.ValidationError(
                {"identifier": "Please provide an email or username."}
            )

        user = (
            User.objects.filter(
                Q(email__iexact=identifier.strip())
                | Q(username__iexact=identifier.strip())
            )
            .select_related("role")
            .first()
        )

        if not user or not user.check_password(password):
            raise serializers.ValidationError(
                {"detail": "Invalid email/username or password."}
            )

        if not user.is_active:
            raise serializers.ValidationError(
                {"detail": "This account has been deactivated."}
            )

        attrs["user"] = user
        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True)

    def validate_refresh(self, value):
        try:
            self.token = RefreshToken(value)
        except TokenError:
            raise serializers.ValidationError("Refresh token is invalid or expired.")
        return value

    def save(self, **kwargs):
        try:
            self.token.blacklist()
        except TokenError:
            raise serializers.ValidationError(
                {"refresh": "Refresh token is invalid or already blacklisted."}
            )


def build_token_response(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserProfileSerializer(user).data,
    }


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect old password.")
        return value

    def validate_new_password(self, value):
        user = self.context["request"].user
        validate_password(value, user=user)
        if user.check_password(value):
            raise serializers.ValidationError(
                "New password must be different from the current password."
            )
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=("password",))
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        user = User.objects.filter(
            email__iexact=normalized_email,
            is_active=True,
        ).first()
        if user is None:
            raise serializers.ValidationError(
                "No active account was found for this email address."
            )
        self.user = user
        return user.email


class PasswordResetConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    token = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        normalized_email = attrs["email"].strip().lower()
        user = User.objects.filter(
            email__iexact=normalized_email,
            is_active=True,
        ).first()
        if user is None or not password_reset_token_generator.check_token(
            user,
            attrs["token"],
        ):
            raise serializers.ValidationError(
                {"token": "Invalid or expired token."}
            )

        validate_password(attrs["new_password"], user=user)
        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=("password",))
        return user


def validate_otp_identifier(attrs):
    email = attrs.get("email")
    phone_number = attrs.get("phone_number")
    if bool(email) == bool(phone_number):
        raise serializers.ValidationError(
            "Provide exactly one of email or phone_number."
        )

    if email:
        identifier = email.strip().lower()
        user = User.objects.filter(
            email__iexact=identifier,
            is_active=True,
        ).first()
        channel = "email"
    else:
        identifier = phone_number.strip()
        user = User.objects.filter(
            phone_number=identifier,
            is_active=True,
        ).first()
        channel = "phone"

    if user is None:
        raise serializers.ValidationError(
            {channel: "No active account was found for this identifier."}
        )

    attrs["identifier"] = identifier
    attrs["channel"] = channel
    attrs["user"] = user
    return attrs


class OTPRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(
        max_length=20,
        required=False,
        trim_whitespace=True,
    )

    def validate(self, attrs):
        return validate_otp_identifier(attrs)


class OTPVerifySerializer(OTPRequestSerializer):
    otp = serializers.RegexField(
        regex=r"^\d{6}$",
        error_messages={"invalid": "OTP must contain exactly 6 digits."},
    )
