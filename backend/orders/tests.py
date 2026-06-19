from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Role, User
from catalog.models import Brand, Category, Product, ProductItem
from locations.models import Address, City, Country, District, Province, Ward
from payments.models import Payment, PaymentMethod, PaymentStatus

from .models import (
    Order,
    OrderLine,
    OrderStatus,
    ReturnRequest,
    ReturnRequestStatus,
    ShippingMethod,
)


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

    def test_admin_rejects_skipping_required_order_statuses(self):
        order = self.create_order(status_name="pending")
        self.client.force_authenticate(user=self.staff)

        response = self.client.patch(
            f"/api/admin/orders/{order.pk}/status/",
            {"status": "shipping"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(order.status.name, "pending")
        self.assertEqual(self.product_item.qty_in_stock, 5)

    def test_admin_can_follow_the_fulfilment_status_sequence(self):
        order = self.create_order(status_name="pending")
        self.client.force_authenticate(user=self.staff)

        for next_status in ("confirmed", "processing", "shipping", "delivered"):
            response = self.client.patch(
                f"/api/admin/orders/{order.pk}/status/",
                {"status": next_status},
                format="json",
            )
            self.assertEqual(response.status_code, 200)

        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(order.status.name, "delivered")
        self.assertEqual(self.product_item.qty_in_stock, 5)


class ReturnRefundAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        customer_role, _ = Role.objects.get_or_create(name="customer")
        staff_role, _ = Role.objects.get_or_create(name="staff")
        cls.customer = User.objects.create_user(
            username="return-customer",
            email="return-customer@example.com",
            full_name="Return Customer",
            password="StrongPassword123!",
            role=customer_role,
        )
        cls.other_customer = User.objects.create_user(
            username="other-return-customer",
            email="other-return-customer@example.com",
            full_name="Other Return Customer",
            password="StrongPassword123!",
            role=customer_role,
        )
        cls.staff = User.objects.create_user(
            username="return-staff",
            email="return-staff@example.com",
            full_name="Return Staff",
            password="StrongPassword123!",
            role=staff_role,
        )

        country = Country.objects.create(name="Return Country", iso_code="RT")
        province = Province.objects.create(country=country, name="Return Province")
        city = City.objects.create(province=province, name="Return City")
        district = District.objects.create(city=city, name="Return District")
        ward = Ward.objects.create(district=district, name="Return Ward")
        cls.address = Address.objects.create(
            address_line1="1 Return Street",
            ward=ward,
            postal_code="700000",
        )

        brand = Brand.objects.create(name="Return Brand")
        category = Category.objects.create(name="Return Camera", slug="return-camera")
        product = Product.objects.create(
            category=category,
            brand=brand,
            name="Return Test Camera",
            is_active=True,
        )
        cls.product_item = ProductItem.objects.create(
            product=product,
            sku="RETURN-CAM-001",
            price=Decimal("100000.00"),
            qty_in_stock=3,
        )

        cls.shipping_method = ShippingMethod.objects.create(
            name="return-standard",
            price=Decimal("30000.00"),
        )
        cls.order_statuses = {
            name: OrderStatus.objects.create(name=name)
            for name in ("pending", "delivered", "refunded")
        }
        cls.return_request_statuses = {
            name.lower(): ReturnRequestStatus.objects.create(name=name)
            for name in ("Pending", "Approved", "Rejected")
        }
        cls.payment_method = PaymentMethod.objects.create(
            name="return-payment",
            description="Return test payment",
        )
        cls.payment_statuses = {
            name: PaymentStatus.objects.create(name=name)
            for name in ("paid", "refunded")
        }

    def setUp(self):
        self.client = APIClient()

    def create_order(
        self,
        *,
        user=None,
        status_name="delivered",
        with_payment=True,
        quantity=2,
    ):
        order = Order.objects.create(
            order_code=f"RETURN-ORD-{Order.objects.count() + 1}",
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
        payment = None
        if with_payment:
            payment = Payment.objects.create(
                order=order,
                payment_method=self.payment_method,
                amount=order.total_amount,
                status=self.payment_statuses["paid"],
            )
        return order, payment

    def test_customer_can_create_and_only_list_own_return_requests(self):
        order, _ = self.create_order()
        other_order, _ = self.create_order(user=self.other_customer)
        ReturnRequest.objects.create(
            order=other_order,
            user=self.other_customer,
            reason="Other customer's return",
            status=self.return_request_statuses["pending"],
        )
        self.client.force_authenticate(user=self.customer)

        create_response = self.client.post(
            "/api/returns/",
            {"order_id": order.pk, "reason": "The camera is defective."},
            format="json",
        )
        list_response = self.client.get("/api/returns/")

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["status"], "Pending")
        self.assertEqual(create_response.data["user_id"], self.customer.pk)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["order_id"], order.pk)

    def test_customer_cannot_return_another_users_order(self):
        order, _ = self.create_order(user=self.other_customer)
        self.client.force_authenticate(user=self.customer)

        response = self.client.post(
            "/api/returns/",
            {"order_id": order.pk, "reason": "Not my order."},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(ReturnRequest.objects.filter(order=order).exists())

    def test_return_requires_delivered_order_within_15_days(self):
        pending_order, _ = self.create_order(status_name="pending")
        expired_order, _ = self.create_order()
        Order.objects.filter(pk=expired_order.pk).update(
            created_at=timezone.now() - timedelta(days=16)
        )
        self.client.force_authenticate(user=self.customer)

        pending_response = self.client.post(
            "/api/returns/",
            {"order_id": pending_order.pk, "reason": "Not delivered."},
            format="json",
        )
        expired_response = self.client.post(
            "/api/returns/",
            {"order_id": expired_order.pk, "reason": "Too late."},
            format="json",
        )

        self.assertEqual(pending_response.status_code, 400)
        self.assertEqual(expired_response.status_code, 400)
        self.assertEqual(
            str(expired_response.data["order_id"][0]),
            "Đã quá thời hạn yêu cầu đổi trả",
        )

    def test_order_can_only_have_one_return_request(self):
        order, _ = self.create_order()
        self.client.force_authenticate(user=self.customer)
        payload = {"order_id": order.pk, "reason": "Duplicate return."}

        first_response = self.client.post("/api/returns/", payload, format="json")
        second_response = self.client.post("/api/returns/", payload, format="json")

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 400)
        self.assertEqual(ReturnRequest.objects.filter(order=order).count(), 1)

    def test_staff_approval_refunds_order_payment_and_restores_stock_once(self):
        order, payment = self.create_order(quantity=2)
        return_request = ReturnRequest.objects.create(
            order=order,
            user=self.customer,
            reason="Defective product.",
            status=self.return_request_statuses["pending"],
        )
        self.client.force_authenticate(user=self.staff)

        list_response = self.client.get("/api/admin/returns/")
        first_response = self.client.patch(
            f"/api/admin/returns/{return_request.pk}/status/",
            {"status": "Approved"},
            format="json",
        )
        second_response = self.client.patch(
            f"/api/admin/returns/{return_request.pk}/status/",
            {"status": "Approved"},
            format="json",
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 400)
        return_request.refresh_from_db()
        order.refresh_from_db()
        payment.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(return_request.status.name, "Approved")
        self.assertEqual(order.status.name, "refunded")
        self.assertEqual(payment.status.name, "refunded")
        self.assertEqual(self.product_item.qty_in_stock, 5)

    def test_staff_rejection_does_not_change_order_payment_or_stock(self):
        order, payment = self.create_order()
        return_request = ReturnRequest.objects.create(
            order=order,
            user=self.customer,
            reason="Changed my mind.",
            status=self.return_request_statuses["pending"],
        )
        self.client.force_authenticate(user=self.staff)

        response = self.client.patch(
            f"/api/admin/returns/{return_request.pk}/status/",
            {"status": "Rejected"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        return_request.refresh_from_db()
        order.refresh_from_db()
        payment.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(return_request.status.name, "Rejected")
        self.assertEqual(order.status.name, "delivered")
        self.assertEqual(payment.status.name, "paid")
        self.assertEqual(self.product_item.qty_in_stock, 3)

    def test_staff_cannot_set_an_unsupported_return_status(self):
        order, _ = self.create_order()
        return_request = ReturnRequest.objects.create(
            order=order,
            user=self.customer,
            reason="Invalid status test.",
            status=self.return_request_statuses["pending"],
        )
        self.client.force_authenticate(user=self.staff)

        response = self.client.patch(
            f"/api/admin/returns/{return_request.pk}/status/",
            {"status": "Pending"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        return_request.refresh_from_db()
        self.assertEqual(return_request.status.name, "Pending")

    def test_approval_rolls_back_when_order_has_no_refundable_payment(self):
        order, _ = self.create_order(with_payment=False)
        return_request = ReturnRequest.objects.create(
            order=order,
            user=self.customer,
            reason="No payment record.",
            status=self.return_request_statuses["pending"],
        )
        self.client.force_authenticate(user=self.staff)

        response = self.client.patch(
            f"/api/admin/returns/{return_request.pk}/status/",
            {"status": "Approved"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        return_request.refresh_from_db()
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(return_request.status.name, "Pending")
        self.assertEqual(order.status.name, "delivered")
        self.assertEqual(self.product_item.qty_in_stock, 3)

    def test_customer_cannot_access_admin_return_endpoints(self):
        order, _ = self.create_order()
        ReturnRequest.objects.create(
            order=order,
            user=self.customer,
            reason="Permission test.",
            status=self.return_request_statuses["pending"],
        )
        self.client.force_authenticate(user=self.customer)

        response = self.client.get("/api/admin/returns/")

        self.assertEqual(response.status_code, 403)
