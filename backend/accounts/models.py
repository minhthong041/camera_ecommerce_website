from django.contrib.auth.models import AbstractUser
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "roles"
        verbose_name = "role"
        verbose_name_plural = "roles"

    def __str__(self):
        return self.name


class User(AbstractUser):
    username_validator = UnicodeUsernameValidator()
    REQUIRED_FIELDS = ["full_name"]

    username = models.CharField(
        _("username"),
        max_length=150,
        unique=True,
        null=True,
        blank=True,
        help_text=_("150 characters or fewer. Letters, digits and @/./+/-/_ only."),
        validators=[username_validator],
        error_messages={
            "unique": _("A user with that username already exists."),
        },
    )
    full_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    dob = models.DateField(null=True, blank=True)
    date_joined = models.DateTimeField(
        _("joined at"),
        default=timezone.now,
        db_column="joined_at",
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name="users",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "users"
        verbose_name = "user"
        verbose_name_plural = "users"

    def __str__(self):
        return self.email or self.username or f"User #{self.pk}"

    def save(self, *args, **kwargs):
        self.username = self._empty_to_none(self.username)
        self.email = self._empty_to_none(self.email)
        self.phone_number = self._empty_to_none(self.phone_number)
        super().save(*args, **kwargs)

    def deactivate_account(self):
        self.username = None
        self.email = None
        self.phone_number = None
        self.is_active = False
        self.save(update_fields=["username", "email", "phone_number", "is_active"])

    @staticmethod
    def _empty_to_none(value):
        if value is None:
            return None

        if isinstance(value, str):
            value = value.strip()
            return value or None

        return value
