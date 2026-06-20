from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Role, User
from catalog.models import Brand, Category, Product, ProductItem

from .models import InventoryLedgerEntry
from .services import InventoryError, adjust_stock


class InventoryLedgerTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        staff_role = Role.objects.create(name="staff")
        customer_role = Role.objects.create(name="customer")
        cls.staff = User.objects.create_user(
            username="inventory-staff",
            email="inventory-staff@example.com",
            full_name="Inventory Staff",
            password="StrongPassword123!",
            role=staff_role,
        )
        cls.customer = User.objects.create_user(
            username="inventory-customer",
            email="inventory-customer@example.com",
            full_name="Inventory Customer",
            password="StrongPassword123!",
            role=customer_role,
        )
        brand = Brand.objects.create(name="Inventory Brand")
        category = Category.objects.create(name="Inventory", slug="inventory")
        cls.product = Product.objects.create(
            category=category,
            brand=brand,
            name="Inventory Camera",
        )
        cls.product_item = ProductItem.objects.create(
            product=cls.product,
            sku="INV-CAM-001",
            price=Decimal("1000.00"),
            qty_in_stock=5,
        )

    def setUp(self):
        self.client = APIClient()

    def test_admin_stock_action_updates_quantity_and_appends_ledger(self):
        self.client.force_authenticate(user=self.staff)

        response = self.client.patch(
            f"/api/admin/product-items/{self.product_item.pk}/stock/",
            {"qty_in_stock": 8, "note": "Warehouse receipt"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        entry = InventoryLedgerEntry.objects.get()
        self.assertEqual(entry.quantity_change, 3)
        self.assertEqual(entry.quantity_before, 5)
        self.assertEqual(entry.quantity_after, 8)
        self.assertEqual(entry.reason, "manual_adjustment")
        self.assertEqual(entry.actor, self.staff)
        self.assertEqual(entry.note, "Warehouse receipt")

    def test_regular_product_item_patch_cannot_bypass_stock_ledger(self):
        self.client.force_authenticate(user=self.staff)

        response = self.client.patch(
            f"/api/admin/product-items/{self.product_item.pk}/",
            {"qty_in_stock": 9},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.product_item.refresh_from_db()
        self.assertEqual(self.product_item.qty_in_stock, 5)
        self.assertFalse(InventoryLedgerEntry.objects.exists())

    def test_admin_product_item_create_records_initial_stock(self):
        self.client.force_authenticate(user=self.staff)

        response = self.client.post(
            "/api/admin/product-items/",
            {
                "product": self.product.pk,
                "sku": "INV-CAM-NEW",
                "price": "1200.00",
                "qty_in_stock": 4,
                "condition": "New",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        entry = InventoryLedgerEntry.objects.get(
            product_item_id=response.data["id"]
        )
        self.assertEqual(entry.reason, "initial_stock")
        self.assertEqual(entry.quantity_before, 0)
        self.assertEqual(entry.quantity_after, 4)

    def test_adjustment_cannot_make_stock_negative(self):
        with self.assertRaises(InventoryError):
            adjust_stock(
                product_item_id=self.product_item.pk,
                new_quantity=-1,
                actor=self.staff,
            )

        self.product_item.refresh_from_db()
        self.assertEqual(self.product_item.qty_in_stock, 5)
        self.assertFalse(InventoryLedgerEntry.objects.exists())

    def test_ledger_is_immutable(self):
        self.client.force_authenticate(user=self.staff)
        self.client.patch(
            f"/api/admin/product-items/{self.product_item.pk}/stock/",
            {"qty_in_stock": 6},
            format="json",
        )
        entry = InventoryLedgerEntry.objects.get()

        entry.note = "Changed"
        with self.assertRaises(DjangoValidationError):
            entry.save()
        with self.assertRaises(DjangoValidationError):
            entry.delete()

    def test_staff_can_filter_ledger_and_customer_is_forbidden(self):
        adjust_stock(
            product_item_id=self.product_item.pk,
            new_quantity=7,
            actor=self.staff,
        )
        self.client.force_authenticate(user=self.staff)

        response = self.client.get(
            "/api/admin/inventory/ledger/",
            {
                "product_item_id": self.product_item.pk,
                "reason": "manual_adjustment",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["sku"], "INV-CAM-001")

        self.client.force_authenticate(user=self.customer)
        forbidden_response = self.client.get("/api/admin/inventory/ledger/")
        self.assertEqual(forbidden_response.status_code, 403)

    def test_invalid_ledger_filter_returns_bad_request(self):
        self.client.force_authenticate(user=self.staff)

        response = self.client.get(
            "/api/admin/inventory/ledger/",
            {"product_item_id": "not-an-id"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("product_item_id", response.data)
