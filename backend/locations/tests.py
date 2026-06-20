import json
from io import BytesIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import Address, City, Country, District, Province, Ward


LOCATION_PAYLOAD = [
    {
        "name": "Thành phố Hà Nội",
        "division_type": "thành phố trung ương",
        "wards": [
            {"name": "Phường Ba Đình"},
            {"name": "Phường Hoàn Kiếm"},
        ],
    },
    {
        "name": "Tỉnh An Giang",
        "division_type": "tỉnh",
        "wards": [{"name": "Phường Long Xuyên"}],
    },
]


class VietnamLocationSeedTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @staticmethod
    def source_response():
        return BytesIO(json.dumps(LOCATION_PAYLOAD, ensure_ascii=False).encode("utf-8"))

    @patch("locations.management.commands.seed_vietnam_locations.urlopen")
    def test_command_seeds_current_two_level_locations_idempotently(self, urlopen):
        urlopen.side_effect = [self.source_response(), self.source_response()]

        call_command("seed_vietnam_locations")
        call_command("seed_vietnam_locations")

        country = Country.objects.get(iso_code="VN")
        self.assertEqual(country.name, "Việt Nam")
        self.assertEqual(Province.objects.filter(country=country).count(), 2)
        self.assertEqual(City.objects.count(), 2)
        self.assertEqual(District.objects.count(), 2)
        self.assertEqual(Ward.objects.count(), 3)

    @patch("locations.management.commands.seed_vietnam_locations.urlopen")
    def test_wards_can_be_filtered_directly_by_province(self, urlopen):
        urlopen.return_value = self.source_response()
        call_command("seed_vietnam_locations")
        province = Province.objects.get(name="Thành phố Hà Nội")

        response = self.client.get(
            "/api/locations/wards/",
            {"province_id": province.pk},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {ward["name"] for ward in response.data},
            {"Phường Ba Đình", "Phường Hoàn Kiếm"},
        )

    @patch("locations.management.commands.seed_vietnam_locations.urlopen")
    def test_replace_is_blocked_when_customer_addresses_exist(self, urlopen):
        urlopen.side_effect = [self.source_response(), self.source_response()]
        call_command("seed_vietnam_locations")
        Address.objects.create(
            address_line1="1 Tràng Tiền",
            ward=Ward.objects.get(name="Phường Hoàn Kiếm"),
            postal_code="100000",
        )

        with self.assertRaisesMessage(
            CommandError,
            "Cannot replace Vietnam locations because customer addresses use them.",
        ):
            call_command("seed_vietnam_locations", replace=True)
