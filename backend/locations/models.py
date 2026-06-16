from django.db import models


class Country(models.Model):
    name = models.CharField(max_length=100, unique=True)
    iso_code = models.CharField(max_length=10, unique=True)

    class Meta:
        db_table = "countries"
        verbose_name = "country"
        verbose_name_plural = "countries"

    def __str__(self):
        return self.name


class Province(models.Model):
    country = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        related_name="provinces",
    )
    name = models.CharField(max_length=100, db_index=True)
    type = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = "provinces"
        verbose_name = "province"
        verbose_name_plural = "provinces"

    def __str__(self):
        return self.name


class City(models.Model):
    province = models.ForeignKey(
        Province,
        on_delete=models.PROTECT,
        related_name="cities",
    )
    name = models.CharField(max_length=255)

    class Meta:
        db_table = "cities"
        verbose_name = "city"
        verbose_name_plural = "cities"

    def __str__(self):
        return self.name


class District(models.Model):
    city = models.ForeignKey(
        City,
        on_delete=models.PROTECT,
        related_name="districts",
    )
    name = models.CharField(max_length=100)

    class Meta:
        db_table = "districts"
        verbose_name = "district"
        verbose_name_plural = "districts"

    def __str__(self):
        return self.name


class Ward(models.Model):
    district = models.ForeignKey(
        District,
        on_delete=models.PROTECT,
        related_name="wards",
    )
    name = models.CharField(max_length=100)

    class Meta:
        db_table = "wards"
        verbose_name = "ward"
        verbose_name_plural = "wards"

    def __str__(self):
        return self.name


class Address(models.Model):
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, null=True, blank=True)
    ward = models.ForeignKey(
        Ward,
        on_delete=models.PROTECT,
        related_name="addresses",
    )
    postal_code = models.CharField(max_length=10)

    class Meta:
        db_table = "addresses"
        verbose_name = "address"
        verbose_name_plural = "addresses"

    def __str__(self):
        return self.address_line1


class UserAddress(models.Model):
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="user_addresses",
    )
    address = models.ForeignKey(
        Address,
        on_delete=models.CASCADE,
        related_name="user_addresses",
    )
    is_default = models.BooleanField(default=True)

    class Meta:
        db_table = "user_addresses"
        verbose_name = "user_address"
        verbose_name_plural = "user_addresses"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "address"],
                name="user_addresses_user_address_unique",
            ),
        ]

    def __str__(self):
        return f"{self.user} - {self.address}"
