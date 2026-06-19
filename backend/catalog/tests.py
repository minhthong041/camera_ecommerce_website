from decimal import Decimal

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from accounts.models import User
from locations.models import Address, City, Country, District, Province, Ward
from orders.models import Order, OrderLine, OrderStatus, ShippingMethod

from .models import Brand, Category, Product, ProductItem


class AdvancedCatalogAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.canon = Brand.objects.create(name="Canon")
        cls.nikon = Brand.objects.create(name="Nikon")
        cls.cameras = Category.objects.create(name="Cameras", slug="cameras")
        cls.lenses = Category.objects.create(name="Lenses", slug="lenses")

        cls.canon_camera = Product.objects.create(
            category=cls.cameras,
            brand=cls.canon,
            name="Canon Camera",
            is_active=True,
        )
        cls.nikon_camera = Product.objects.create(
            category=cls.cameras,
            brand=cls.nikon,
            name="Nikon Camera",
            is_active=True,
        )
        cls.canon_lens = Product.objects.create(
            category=cls.lenses,
            brand=cls.canon,
            name="Canon Lens",
            is_active=True,
        )
        cls.inactive_product = Product.objects.create(
            category=cls.cameras,
            brand=cls.canon,
            name="Inactive Camera",
            is_active=False,
        )

        cls.canon_item = cls.create_item(
            cls.canon_camera,
            "CANON-NEW-1",
            "100.00",
            2,
            "New",
        )
        cls.canon_second_item = cls.create_item(
            cls.canon_camera,
            "CANON-NEW-2",
            "120.00",
            1,
            "New",
        )
        cls.canon_used_item = cls.create_item(
            cls.canon_camera,
            "CANON-USED",
            "150.00",
            0,
            "Used",
        )
        cls.nikon_item = cls.create_item(
            cls.nikon_camera,
            "NIKON-NEW",
            "200.00",
            0,
            "New",
        )
        cls.lens_item = cls.create_item(
            cls.canon_lens,
            "LENS-USED",
            "50.00",
            5,
            "Used",
        )
        cls.create_item(
            cls.inactive_product,
            "INACTIVE",
            "10.00",
            10,
            "New",
        )

        user = User.objects.create_user(
            username="buyer",
            email="buyer@example.com",
            full_name="Test Buyer",
            password="StrongPassword123!",
        )
        country = Country.objects.create(name="Vietnam", iso_code="VN")
        province = Province.objects.create(country=country, name="Ho Chi Minh")
        city = City.objects.create(province=province, name="Thu Duc")
        district = District.objects.create(city=city, name="District 1")
        ward = Ward.objects.create(district=district, name="Ward 1")
        address = Address.objects.create(
            address_line1="1 Test Street",
            ward=ward,
            postal_code="700000",
        )
        shipping_method = ShippingMethod.objects.create(
            name="standard",
            price=Decimal("30000.00"),
        )
        delivered = OrderStatus.objects.create(name="delivered")
        order = Order.objects.create(
            order_code="ORD-CATALOG-001",
            user=user,
            shipping_method=shipping_method,
            shipping_address=address,
            total_amount=Decimal("1000.00"),
            status=delivered,
        )
        OrderLine.objects.create(
            order=order,
            product_item=cls.canon_item,
            price=cls.canon_item.price,
            quantity=3,
        )
        OrderLine.objects.create(
            order=order,
            product_item=cls.canon_second_item,
            price=cls.canon_second_item.price,
            quantity=2,
        )
        OrderLine.objects.create(
            order=order,
            product_item=cls.nikon_item,
            price=cls.nikon_item.price,
            quantity=7,
        )

    @staticmethod
    def create_item(product, sku, price, stock, condition):
        return ProductItem.objects.create(
            product=product,
            sku=sku,
            price=Decimal(price),
            qty_in_stock=stock,
            condition=condition,
        )

    def setUp(self):
        self.client = APIClient()

    def product_results(self, query_string=""):
        response = self.client.get(f"/api/catalog/products/{query_string}")
        self.assertEqual(response.status_code, 200)
        return response.data["results"]

    def test_list_exposes_price_stock_annotations_without_n_plus_one(self):
        with CaptureQueriesContext(connection) as queries:
            results = self.product_results()

        products = {product["id"]: product for product in results}
        canon = products[self.canon_camera.pk]
        self.assertEqual(canon["min_price"], "100.00")
        self.assertEqual(canon["total_stock"], 3)
        self.assertEqual(canon["total_sold"], 0)
        self.assertNotIn(self.inactive_product.pk, products)
        self.assertLessEqual(len(queries), 4)

    def test_price_brand_and_category_filters(self):
        price_results = self.product_results("?price_min=90&price_max=150")
        brand_results = self.product_results(f"?brand={self.canon.pk}")
        category_results = self.product_results(
            f"?category={self.cameras.pk}"
        )

        self.assertEqual(
            [product["id"] for product in price_results],
            [self.canon_camera.pk],
        )
        self.assertEqual(
            {product["id"] for product in brand_results},
            {self.canon_camera.pk, self.canon_lens.pk},
        )
        self.assertEqual(
            {product["id"] for product in category_results},
            {self.canon_camera.pk, self.nikon_camera.pk},
        )

    def test_stock_and_condition_filters(self):
        in_stock = self.product_results("?in_stock=true")
        out_of_stock = self.product_results("?in_stock=false")
        new_products = self.product_results("?condition=New")
        used_products = self.product_results("?condition=Used")

        self.assertEqual(
            {product["id"] for product in in_stock},
            {self.canon_camera.pk, self.canon_lens.pk},
        )
        self.assertEqual(
            [product["id"] for product in out_of_stock],
            [self.nikon_camera.pk],
        )
        self.assertEqual(
            {product["id"] for product in new_products},
            {self.canon_camera.pk, self.nikon_camera.pk},
        )
        filtered_canon = next(
            product
            for product in new_products
            if product["id"] == self.canon_camera.pk
        )
        self.assertEqual(filtered_canon["total_stock"], 3)
        self.assertEqual(
            {product["id"] for product in used_products},
            {self.canon_camera.pk, self.canon_lens.pk},
        )

    def test_sorting_aliases(self):
        ascending = self.product_results("?sort=price_asc")
        descending = self.product_results("?sort=price_desc")
        newest = self.product_results("?sort=newest")

        self.assertEqual(
            [product["id"] for product in ascending],
            [self.canon_lens.pk, self.canon_camera.pk, self.nikon_camera.pk],
        )
        self.assertEqual(
            [product["id"] for product in descending],
            [self.nikon_camera.pk, self.canon_camera.pk, self.canon_lens.pk],
        )
        self.assertEqual(
            [product["id"] for product in newest],
            [self.canon_lens.pk, self.nikon_camera.pk, self.canon_camera.pk],
        )

    def test_related_products_use_same_category_and_exclude_current_product(self):
        response = self.client.get(
            f"/api/catalog/products/{self.canon_camera.pk}/related/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [product["id"] for product in response.data],
            [self.nikon_camera.pk],
        )

    def test_best_sellers_are_ranked_by_total_quantity(self):
        response = self.client.get("/api/catalog/products/best-sellers/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [product["id"] for product in response.data],
            [self.nikon_camera.pk, self.canon_camera.pk],
        )
        self.assertEqual(response.data[0]["total_sold"], 7)
        self.assertEqual(response.data[1]["total_sold"], 5)
        self.assertEqual(response.data[1]["total_stock"], 3)
