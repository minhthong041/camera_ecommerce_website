from django.contrib import admin

from .models import Address, City, Country, District, Province, UserAddress, Ward


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "iso_code")
    search_fields = ("name", "iso_code")


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "type", "country")
    list_filter = ("country", "type")
    search_fields = ("name",)
    list_select_related = ("country",)


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "province")
    list_filter = ("province",)
    search_fields = ("name",)
    list_select_related = ("province",)


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "city")
    list_filter = ("city",)
    search_fields = ("name",)
    list_select_related = ("city",)


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "district")
    list_filter = ("district",)
    search_fields = ("name",)
    list_select_related = ("district",)


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ("id", "address_line1", "ward", "postal_code")
    search_fields = ("address_line1", "address_line2", "postal_code")
    list_select_related = ("ward",)


@admin.register(UserAddress)
class UserAddressAdmin(admin.ModelAdmin):
    list_display = ("user", "address", "is_default")
    list_filter = ("is_default",)
    search_fields = ("user__username", "user__email", "address__address_line1")
    list_select_related = ("user", "address")
