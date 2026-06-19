from rest_framework import serializers

from .models import Address, City, Country, District, Province, Ward


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ("id", "name", "iso_code")
        read_only_fields = fields


class ProvinceSerializer(serializers.ModelSerializer):
    country_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Province
        fields = ("id", "country_id", "name")
        read_only_fields = fields


class CitySerializer(serializers.ModelSerializer):
    province_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = City
        fields = ("id", "province_id", "name")
        read_only_fields = fields


class DistrictSerializer(serializers.ModelSerializer):
    city_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = District
        fields = ("id", "city_id", "name")
        read_only_fields = fields


class WardSerializer(serializers.ModelSerializer):
    district_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Ward
        fields = ("id", "district_id", "name")
        read_only_fields = fields


class ProvinceDetailSerializer(serializers.ModelSerializer):
    country_id = serializers.IntegerField(read_only=True)
    country = CountrySerializer(read_only=True)

    class Meta:
        model = Province
        fields = ("id", "country_id", "name", "country")
        read_only_fields = fields


class CityDetailSerializer(serializers.ModelSerializer):
    province_id = serializers.IntegerField(read_only=True)
    province = ProvinceDetailSerializer(read_only=True)

    class Meta:
        model = City
        fields = ("id", "province_id", "name", "province")
        read_only_fields = fields


class DistrictDetailSerializer(serializers.ModelSerializer):
    city_id = serializers.IntegerField(read_only=True)
    city = CityDetailSerializer(read_only=True)

    class Meta:
        model = District
        fields = ("id", "city_id", "name", "city")
        read_only_fields = fields


class WardDetailSerializer(serializers.ModelSerializer):
    district_id = serializers.IntegerField(read_only=True)
    district = DistrictDetailSerializer(read_only=True)

    class Meta:
        model = Ward
        fields = ("id", "district_id", "name", "district")
        read_only_fields = fields


class AddressSerializer(serializers.ModelSerializer):
    ward_id = serializers.IntegerField(read_only=True)
    ward = WardDetailSerializer(read_only=True)
    is_default = serializers.SerializerMethodField()

    class Meta:
        model = Address
        fields = (
            "id",
            "address_line1",
            "address_line2",
            "ward_id",
            "ward",
            "postal_code",
            "is_default",
        )
        read_only_fields = fields

    def get_is_default(self, obj):
        user_addresses = getattr(obj, "current_user_addresses", None)
        if user_addresses is not None:
            return user_addresses[0].is_default if user_addresses else False

        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False

        return obj.user_addresses.filter(user=request.user, is_default=True).exists()


class AddressCreateUpdateSerializer(serializers.ModelSerializer):
    ward_id = serializers.PrimaryKeyRelatedField(
        source="ward",
        queryset=Ward.objects.select_related(
            "district",
            "district__city",
            "district__city__province",
            "district__city__province__country",
        ),
        write_only=True,
    )
    is_default = serializers.BooleanField(required=False)

    class Meta:
        model = Address
        fields = (
            "address_line1",
            "address_line2",
            "ward_id",
            "postal_code",
            "is_default",
        )
        extra_kwargs = {
            "address_line1": {"required": True, "allow_blank": False},
            "address_line2": {"required": False, "allow_blank": True},
            "postal_code": {"required": True, "allow_blank": False},
        }

