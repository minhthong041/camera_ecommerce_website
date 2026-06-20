from django.db import transaction
from django.db.models import Prefetch, ProtectedError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Address, City, Country, District, Province, UserAddress, Ward
from .serializers import (
    AddressCreateUpdateSerializer,
    AddressSerializer,
    CitySerializer,
    CountrySerializer,
    DistrictSerializer,
    ProvinceSerializer,
    WardSerializer,
)


def get_integer_query_param(request, param_name):
    value = request.query_params.get(param_name)
    if value in (None, ""):
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError({param_name: "Must be a valid integer."})


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Country.objects.order_by("name")
    serializer_class = CountrySerializer
    permission_classes = (AllowAny,)


class ProvinceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProvinceSerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        queryset = Province.objects.select_related("country").order_by("name")
        country_id = get_integer_query_param(self.request, "country_id")
        if country_id is not None:
            queryset = queryset.filter(country_id=country_id)
        return queryset


class CityViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CitySerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        queryset = City.objects.select_related("province").order_by("name")
        province_id = get_integer_query_param(self.request, "province_id")
        if province_id is not None:
            queryset = queryset.filter(province_id=province_id)
        return queryset


class DistrictViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DistrictSerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        queryset = District.objects.select_related("city").order_by("name")
        city_id = get_integer_query_param(self.request, "city_id")
        if city_id is not None:
            queryset = queryset.filter(city_id=city_id)
        return queryset


class WardViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WardSerializer
    permission_classes = (AllowAny,)

    def get_queryset(self):
        queryset = Ward.objects.select_related(
            "district",
            "district__city",
            "district__city__province",
        ).order_by("name")
        district_id = get_integer_query_param(self.request, "district_id")
        province_id = get_integer_query_param(self.request, "province_id")
        if district_id is not None:
            queryset = queryset.filter(district_id=district_id)
        if province_id is not None:
            queryset = queryset.filter(district__city__province_id=province_id)
        return queryset


class AddressViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    http_method_names = ("get", "post", "patch", "delete", "head", "options")

    def get_queryset(self):
        user_address_queryset = UserAddress.objects.filter(
            user=self.request.user
        ).select_related("user", "address")

        return (
            Address.objects.filter(user_addresses__user=self.request.user)
            .select_related(
                "ward",
                "ward__district",
                "ward__district__city",
                "ward__district__city__province",
                "ward__district__city__province__country",
            )
            .prefetch_related(
                Prefetch(
                    "user_addresses",
                    queryset=user_address_queryset,
                    to_attr="current_user_addresses",
                )
            )
            .order_by("-user_addresses__is_default", "id")
        )

    def get_serializer_class(self):
        if self.action in {"create", "partial_update"}:
            return AddressCreateUpdateSerializer
        return AddressSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        is_default = serializer.validated_data.pop("is_default", False)

        with transaction.atomic():
            has_existing_address = UserAddress.objects.filter(user=request.user).exists()
            address = serializer.save()
            UserAddress.objects.create(
                user=request.user,
                address=address,
                is_default=False,
            )

            if is_default or not has_existing_address:
                self.set_default_address(request.user, address)

        address = self.get_queryset().get(pk=address.pk)
        output_serializer = AddressSerializer(
            address,
            context=self.get_serializer_context(),
        )
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        address = self.get_object()
        serializer = self.get_serializer(address, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        is_default = serializer.validated_data.pop("is_default", None)

        with transaction.atomic():
            address = serializer.save()
            if is_default is True:
                self.set_default_address(request.user, address)
            elif is_default is False:
                UserAddress.objects.filter(
                    user=request.user,
                    address=address,
                ).update(is_default=False)
                self.ensure_user_has_default_address(request.user)

        address = self.get_queryset().get(pk=address.pk)
        output_serializer = AddressSerializer(
            address,
            context=self.get_serializer_context(),
        )
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        address = self.get_object()

        with transaction.atomic():
            deleted_default = UserAddress.objects.filter(
                user=request.user,
                address=address,
                is_default=True,
            ).exists()
            UserAddress.objects.filter(user=request.user, address=address).delete()

            if deleted_default:
                self.ensure_user_has_default_address(request.user)

            has_user_links = UserAddress.objects.filter(address=address).exists()
            has_orders = address.orders.exists()
            if not has_user_links and not has_orders:
                try:
                    address.delete()
                except ProtectedError:
                    pass

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"], url_path="default")
    def set_default(self, request, pk=None):
        address = self.get_object()

        with transaction.atomic():
            self.set_default_address(request.user, address)

        address = self.get_queryset().get(pk=address.pk)
        serializer = AddressSerializer(address, context=self.get_serializer_context())
        return Response(serializer.data, status=status.HTTP_200_OK)

    @staticmethod
    def set_default_address(user, address):
        UserAddress.objects.filter(user=user).update(is_default=False)
        UserAddress.objects.filter(user=user, address=address).update(is_default=True)

    @staticmethod
    def ensure_user_has_default_address(user):
        has_default = UserAddress.objects.filter(
            user=user,
            is_default=True,
        ).exists()
        if has_default:
            return

        next_address = (
            UserAddress.objects.filter(user=user).order_by("address_id").first()
        )
        if next_address:
            next_address.is_default = True
            next_address.save(update_fields=("is_default",))
