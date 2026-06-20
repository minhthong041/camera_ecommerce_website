from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Brand, Category, Product, ProductItem

from .models import WishlistItem


class WishlistAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="wishlist-user",
            email="wishlist@example.com",
            full_name="Wishlist User",
            password="StrongPassword123!",
        )
        brand = Brand.objects.create(name="Wishlist Brand")
        category = Category.objects.create(name="Camera", slug="wishlist-camera")
        product = Product.objects.create(
            category=category,
            brand=brand,
            name="Wishlist Camera",
        )
        cls.product_item = ProductItem.objects.create(
            product=product,
            sku="WISH-CAM-001",
            price=Decimal("1000000.00"),
            qty_in_stock=5,
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_list_includes_product_id_for_product_detail_links(self):
        WishlistItem.objects.create(
            user=self.user,
            product_item=self.product_item,
        )

        response = self.client.get("/api/wishlist/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data[0]["product_item"]["product_id"],
            self.product_item.product_id,
        )

    def test_adding_duplicate_item_is_idempotent(self):
        payload = {"product_item_id": self.product_item.pk}

        first_response = self.client.post("/api/wishlist/", payload, format="json")
        second_response = self.client.post("/api/wishlist/", payload, format="json")

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(WishlistItem.objects.count(), 1)

    def test_user_can_remove_item_by_product_item_id(self):
        WishlistItem.objects.create(
            user=self.user,
            product_item=self.product_item,
        )

        response = self.client.delete(
            f"/api/wishlist/{self.product_item.pk}/",
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(WishlistItem.objects.exists())
