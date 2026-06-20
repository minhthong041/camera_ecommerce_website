import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from locations.models import Address, City, Country, District, Province, Ward


DEFAULT_SOURCE_URL = "https://provinces.open-api.vn/api/v2/?depth=2"
BRIDGE_DISTRICT_NAME = "Đơn vị hành chính cấp tỉnh"


class Command(BaseCommand):
    help = "Seed Vietnam's current provinces and wards from Provinces Open API v2."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source-url",
            default=DEFAULT_SOURCE_URL,
            help="JSON endpoint containing province and ward data.",
        )
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Replace existing Vietnam location data when no address uses it.",
        )

    def handle(self, *args, **options):
        payload = self.fetch_payload(options["source_url"])
        self.validate_payload(payload)

        with transaction.atomic():
            country, _ = Country.objects.update_or_create(
                iso_code="VN",
                defaults={"name": "Việt Nam"},
            )
            if options["replace"]:
                self.clear_existing_data(country)

            province_count = 0
            ward_count = 0
            for province_data in payload:
                province, _ = Province.objects.update_or_create(
                    country=country,
                    name=province_data["name"].strip(),
                    defaults={"type": province_data.get("division_type", "")},
                )

                # The project keeps legacy City/District tables. These two records
                # bridge the current two-level Vietnam hierarchy without exposing
                # artificial choices to customers.
                city, _ = City.objects.get_or_create(
                    province=province,
                    name=province.name,
                )
                district, _ = District.objects.get_or_create(
                    city=city,
                    name=BRIDGE_DISTRICT_NAME,
                )

                wards = [
                    Ward(district=district, name=ward_data["name"].strip())
                    for ward_data in province_data.get("wards", [])
                ]
                existing_names = set(
                    Ward.objects.filter(district=district).values_list("name", flat=True)
                )
                new_wards = [ward for ward in wards if ward.name not in existing_names]
                Ward.objects.bulk_create(new_wards, batch_size=500)

                province_count += 1
                ward_count += len(wards)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded Vietnam locations: {province_count} provinces/cities, "
                f"{ward_count} wards/communes."
            )
        )

    @staticmethod
    def fetch_payload(source_url):
        request = Request(
            source_url,
            headers={"Accept": "application/json", "User-Agent": "CameraShop/1.0"},
        )
        try:
            with urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise CommandError(f"Could not download Vietnam location data: {exc}") from exc

    @staticmethod
    def validate_payload(payload):
        if not isinstance(payload, list) or not payload:
            raise CommandError("Location source must contain a non-empty list.")
        for province in payload:
            if not province.get("name") or not isinstance(province.get("wards"), list):
                raise CommandError("Location source has an invalid province entry.")
            if any(not ward.get("name") for ward in province["wards"]):
                raise CommandError("Location source has an invalid ward entry.")

    @staticmethod
    def clear_existing_data(country):
        address_exists = Address.objects.filter(
            ward__district__city__province__country=country
        ).exists()
        if address_exists:
            raise CommandError(
                "Cannot replace Vietnam locations because customer addresses use them."
            )

        province_queryset = Province.objects.filter(country=country)
        Ward.objects.filter(district__city__province__in=province_queryset).delete()
        District.objects.filter(city__province__in=province_queryset).delete()
        City.objects.filter(province__in=province_queryset).delete()
        province_queryset.delete()
