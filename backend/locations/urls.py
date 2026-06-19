from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AddressViewSet,
    CityViewSet,
    CountryViewSet,
    DistrictViewSet,
    ProvinceViewSet,
    WardViewSet,
)

router = DefaultRouter()
router.register("locations/countries", CountryViewSet, basename="country")
router.register("locations/provinces", ProvinceViewSet, basename="province")
router.register("locations/cities", CityViewSet, basename="city")
router.register("locations/districts", DistrictViewSet, basename="district")
router.register("locations/wards", WardViewSet, basename="ward")
router.register("addresses", AddressViewSet, basename="address")

urlpatterns = [
    path("", include(router.urls)),
]

