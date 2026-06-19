from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Role, User
from catalog.models import Brand, Category, Product, ProductItem
from locations.models import Address, City, Country, District, Province, Ward

from .models import Order, OrderLine, OrderStatus, ShippingMethod


class OrderManagementAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        customer_role = Role.objects.create(name="customer")
        staff_role = Role.objects.create(name="staff")
        cls.customer = User.objects.create_user(
            username="customer",
            email="customer@example.com",
            full_name="Customer",
            password="StrongPassword123!",
            role=customer_role,
        )
        cls.other_customer = User.objects.create_user(
            username="other-customer",
            email="other@example.com",
            full_name="Other Customer",
            password="StrongPassword123!",
            role=customer_role,
        )
        cls.staff = User.objects.create_user(
            username="staff",
            email="staff@example.com",
            full_name="Staff",
            password="StrongPassword123!",
            is_staff=True,
            role=staff_role,
        )

        country = Country.objects.create(name="Vietnam", iso_code="VN")
        province = Province.objects.create(country=country, name="Ho Chi Minh")
        city = City.objects.create(province=province, name="Thu Duc")
        district = District.objects.create(city=city, name="District 1")
        ward = Ward.objects.create(district=district, name="Ward 1")
        cls.address = Address.objects.create(
            address_line1="1 Test Street",
            ward=ward,
            postal_code="700000",
        )

        brand = Brand.objects.create(name="Test Brand")
        category = Category.objects.create(name="Camera", slug="camera")
        product = Product.objects.create(
            category=category,
            brand=brand,
            name="Test Camera",
            is_active=True,
        )
        cls.product_item = ProductItem.objects.create(
            product=product,
            sku="CAM-001",
            price=Decimal("100000.00"),
            qty_in_stock=5,
        )

        cls.shipping_method = ShippingMethod.objects.create(
            name="standard",
            price=Decimal("30000.00"),
        )
        cls.order_statuses = {
            name: OrderStatus.objects.create(name=name)
            for name in (
                "pending",
                "confirmed",
                "processing",
                "shipping",
                "delivered",
                "cancelled",
                "refunded",
            )
        }

    def setUp(self):
        self.client = APIClient()

    def create_order(
        self,
        *,
        user=None,
        status_name="pending",
        order_code=None,
        quantity=2,
    ):
        order = Order.objects.create(
            order_code=order_code or f"ORD-{Order.objects.count() + 1}",
            user=user or self.customer,
            shipping_method=self.shipping_method,
            shipping_address=self.address,
            total_amount=Decimal("230000.00"),
            status=self.order_statuses[status_name],
        )
        OrderLine.objects.create(
            order=order,
            product_item=self.product_item,
            price=Decimal("100000.00"),
            quantity=quantity,
        )
        return order

    def test_customer_only_sees_own_orders_and_nested_lines(self):
        own_order = self.create_order(order_code="ORD-OWN")
        other_order = self.create_order(
            user=self.other_customer,
            order_code="ORD-OTHER",
        )
        self.client.force_authenticate(user=self.customer)

        list_response = self.client.get("/api/orders/")
        detail_response = self.client.get(f"/api/orders/{own_order.pk}/")
        other_detail_response = self.client.get(f"/api/orders/{other_order.pk}/")

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["order_code"], "ORD-OWN")
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.data["status_name"], "pending")
        self.assertEqual(len(detail_response.data["order_lines"]), 1)
        self.assertEqual(
            detail_response.data["order_lines"][0]["product_item"]["sku"],
            "CAM-001",
        )
        self.assertEqual(other_detail_response.status_code, 404)

    def test_customer_cancel_restores_stock_only_once(self):
        order = self.create_order(status_name="pending")
        self.client.force_authenticate(user=self.customer)

        first_response = self.client.post(f"/api/orders/{order.pk}/cancel/")
        second_response = self.client.post(f"/api/orders/{order.pk}/cancel/")

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(first_response.data["status_name"], "cancelled")
        self.assertEqual(second_response.status_code, 400)
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(order.status.name, "cancelled")
        self.assertEqual(self.product_item.qty_in_stock, 7)

    def test_customer_cannot_cancel_shipping_order(self):
        order = self.create_order(status_name="shipping")
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(f"/api/orders/{order.pk}/cancel/")

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(order.status.name, "shipping")
        self.assertEqual(self.product_item.qty_in_stock, 5)

    def test_admin_list_supports_status_filter_and_order_code_search(self):
        self.create_order(status_name="pending", order_code="ORD-PENDING")
        shipping_order = self.create_order(
            user=self.other_customer,
            status_name="shipping",
            order_code="ORD-SHIP-001",
        )
        self.create_order(
            status_name="shipping",
            order_code="OTHER-SHIPPING",
        )
        self.client.force_authenticate(user=self.staff)

        response = self.client.get(
            "/api/admin/orders/?status=shipping&search=ORD-SHIP"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], shipping_order.pk)

    def test_customer_cannot_access_admin_orders(self):
        self.create_order()
        self.client.force_authenticate(user=self.customer)

        response = self.client.get("/api/admin/orders/")

        self.assertEqual(response.status_code, 403)

    def test_admin_cancel_restores_stock_and_terminal_status_cannot_reopen(self):
        order = self.create_order(status_name="processing")
        self.client.force_authenticate(user=self.staff)

        cancel_response = self.client.patch(
            f"/api/admin/orders/{order.pk}/status/",
            {"status": "cancelled"},
            format="json",
        )
        reopen_response = self.client.patch(
            f"/api/admin/orders/{order.pk}/status/",
            {"status": "processing"},
            format="json",
        )

        self.assertEqual(cancel_response.status_code, 200)
        self.assertEqual(reopen_response.status_code, 400)
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(order.status.name, "cancelled")
        self.assertEqual(self.product_item.qty_in_stock, 7)

    def test_admin_refund_delivered_order_restores_stock(self):
        order = self.create_order(status_name="delivered", quantity=3)
        self.client.force_authenticate(user=self.staff)

        response = self.client.patch(
            f"/api/admin/orders/{order.pk}/status/",
            {"status": "REFUNDED"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(order.status.name, "refunded")
        self.assertEqual(self.product_item.qty_in_stock, 8)

    def test_admin_rejects_unknown_status(self):
        order = self.create_order(status_name="pending")
        self.client.force_authenticate(user=self.staff)

        response = self.client.patch(
            f"/api/admin/orders/{order.pk}/status/",
            {"status": "unknown"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.status.name, "pending")
