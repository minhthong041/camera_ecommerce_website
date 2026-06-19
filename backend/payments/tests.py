import hashlib
import hmac
import json
import time
from decimal import Decimal
from types import SimpleNamespace
from urllib.parse import urlencode
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import Brand, Category, Product, ProductItem
from locations.models import Address, City, Country, District, Province, Ward
from orders.models import Order, OrderLine, OrderStatus, ShippingMethod

from .models import Payment, PaymentMethod, PaymentStatus


@override_settings(
    VNPAY_TMN_CODE="TESTMERCHANT",
    VNPAY_HASH_SECRET="test-vnpay-secret",
    STRIPE_SECRET_KEY="sk_test_placeholder",
    STRIPE_WEBHOOK_SECRET="whsec_test_secret",
    STRIPE_CURRENCY="vnd",
)
class PaymentWebhookTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="payment-user",
            email="payment@example.com",
            full_name="Payment User",
            password="StrongPassword123!",
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
            sku="CAM-TEST-001",
            price=Decimal("100000.00"),
            qty_in_stock=3,
        )

        cls.shipping_method = ShippingMethod.objects.create(
            name="Standard",
            price=Decimal("0.00"),
        )
        cls.order_pending = OrderStatus.objects.create(name="Pending")
        cls.order_processing = OrderStatus.objects.create(name="Processing")
        cls.order_cancelled = OrderStatus.objects.create(name="Cancelled")
        cls.payment_pending = PaymentStatus.objects.create(name="Pending")
        cls.payment_paid = PaymentStatus.objects.create(name="Paid")
        cls.payment_failed = PaymentStatus.objects.create(name="Failed")
        cls.vnpay_method = PaymentMethod.objects.create(name="VNPay")
        cls.stripe_method = PaymentMethod.objects.create(name="Stripe")

    def setUp(self):
        self.client = APIClient()

    def create_order(self):
        order = Order.objects.create(
            order_code=f"ORDER-{Order.objects.count() + 1}",
            user=self.user,
            shipping_method=self.shipping_method,
            shipping_address=self.address,
            total_amount=Decimal("100000.00"),
            status=self.order_pending,
        )
        OrderLine.objects.create(
            order=order,
            product_item=self.product_item,
            price=Decimal("100000.00"),
            quantity=2,
        )
        return order

    def create_order_and_payment(self, payment_method, transaction_id=None):
        order = self.create_order()
        payment = Payment.objects.create(
            order=order,
            payment_method=payment_method,
            provider_transaction_id=transaction_id,
            amount=order.total_amount,
            status=self.payment_pending,
        )
        return order, payment

    def sign_vnpay_params(self, params):
        signed_data = urlencode(sorted(params.items()))
        return hmac.new(
            b"test-vnpay-secret",
            signed_data.encode(),
            hashlib.sha512,
        ).hexdigest()

    def stripe_signature(self, payload):
        timestamp = int(time.time())
        signed_payload = f"{timestamp}.{payload}".encode()
        signature = hmac.new(
            b"whsec_test_secret",
            signed_payload,
            hashlib.sha256,
        ).hexdigest()
        return f"t={timestamp},v1={signature}"

    def test_vnpay_payment_creation_uses_order_total(self):
        order = self.create_order()
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/payments/",
            {
                "order_id": order.pk,
                "payment_method_id": self.vnpay_method.pk,
                "amount": "1.00",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("redirect_url", response.data)
        payment = Payment.objects.get(pk=response.data["payment_id"])
        self.assertEqual(payment.amount, order.total_amount)
        self.assertEqual(payment.status, self.payment_pending)

    @patch("payments.views.stripe.StripeClient")
    def test_stripe_payment_creation_returns_client_secret(self, stripe_client):
        payment_intent = SimpleNamespace(
            id="pi_test_created_001",
            client_secret="pi_test_created_001_secret",
        )
        stripe_client.return_value.v1.payment_intents.create.return_value = (
            payment_intent
        )
        order = self.create_order()
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            "/api/payments/",
            {
                "order_id": order.pk,
                "payment_method_id": self.stripe_method.pk,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            response.data["client_secret"],
            "pi_test_created_001_secret",
        )
        payment = Payment.objects.get(pk=response.data["payment_id"])
        self.assertEqual(payment.provider_transaction_id, "pi_test_created_001")
        self.assertEqual(payment.amount, order.total_amount)

        create_params = (
            stripe_client.return_value.v1.payment_intents.create.call_args.args[0]
        )
        self.assertEqual(create_params["amount"], 100000)
        self.assertEqual(create_params["currency"], "vnd")

    def test_vnpay_failed_callback_restores_stock_only_once(self):
        order, payment = self.create_order_and_payment(self.vnpay_method)
        params = {
            "vnp_Amount": "10000000",
            "vnp_ResponseCode": "24",
            "vnp_TmnCode": "TESTMERCHANT",
            "vnp_TransactionNo": "VNPAY-FAILED-001",
            "vnp_TransactionStatus": "02",
            "vnp_TxnRef": str(payment.pk),
        }
        params["vnp_SecureHash"] = self.sign_vnpay_params(params)

        first_response = self.client.post(
            "/api/payments/vnpay/callback/",
            params,
            format="json",
        )
        second_response = self.client.post(
            "/api/payments/vnpay/callback/",
            params,
            format="json",
        )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(
            second_response.data["Message"],
            "Transaction already processed",
        )

        payment.refresh_from_db()
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(payment.status, self.payment_failed)
        self.assertEqual(order.status, self.order_cancelled)
        self.assertEqual(self.product_item.qty_in_stock, 5)

    def test_success_callback_after_customer_cancel_does_not_reopen_order(self):
        order, payment = self.create_order_and_payment(self.vnpay_method)
        self.client.force_authenticate(user=self.user)
        cancel_response = self.client.post(f"/api/orders/{order.pk}/cancel/")

        params = {
            "vnp_Amount": "10000000",
            "vnp_ResponseCode": "00",
            "vnp_TmnCode": "TESTMERCHANT",
            "vnp_TransactionNo": "VNPAY-LATE-SUCCESS-001",
            "vnp_TransactionStatus": "00",
            "vnp_TxnRef": str(payment.pk),
        }
        params["vnp_SecureHash"] = self.sign_vnpay_params(params)
        callback_response = self.client.post(
            "/api/payments/vnpay/callback/",
            params,
            format="json",
        )

        self.assertEqual(cancel_response.status_code, 200)
        self.assertEqual(callback_response.status_code, 200)
        payment.refresh_from_db()
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(payment.status, self.payment_paid)
        self.assertEqual(order.status, self.order_cancelled)
        self.assertEqual(self.product_item.qty_in_stock, 5)

    def test_failed_callback_after_customer_cancel_does_not_restore_stock_twice(self):
        order, payment = self.create_order_and_payment(self.vnpay_method)
        self.client.force_authenticate(user=self.user)
        cancel_response = self.client.post(f"/api/orders/{order.pk}/cancel/")

        params = {
            "vnp_Amount": "10000000",
            "vnp_ResponseCode": "24",
            "vnp_TmnCode": "TESTMERCHANT",
            "vnp_TransactionNo": "VNPAY-LATE-FAILED-001",
            "vnp_TransactionStatus": "02",
            "vnp_TxnRef": str(payment.pk),
        }
        params["vnp_SecureHash"] = self.sign_vnpay_params(params)
        callback_response = self.client.post(
            "/api/payments/vnpay/callback/",
            params,
            format="json",
        )

        self.assertEqual(cancel_response.status_code, 200)
        self.assertEqual(callback_response.status_code, 200)
        payment.refresh_from_db()
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(payment.status, self.payment_failed)
        self.assertEqual(order.status, self.order_cancelled)
        self.assertEqual(self.product_item.qty_in_stock, 5)

    def test_successful_payment_prevents_later_customer_cancellation(self):
        order, payment = self.create_order_and_payment(self.vnpay_method)
        params = {
            "vnp_Amount": "10000000",
            "vnp_ResponseCode": "00",
            "vnp_TmnCode": "TESTMERCHANT",
            "vnp_TransactionNo": "VNPAY-SUCCESS-BEFORE-CANCEL-001",
            "vnp_TransactionStatus": "00",
            "vnp_TxnRef": str(payment.pk),
        }
        params["vnp_SecureHash"] = self.sign_vnpay_params(params)
        callback_response = self.client.post(
            "/api/payments/vnpay/callback/",
            params,
            format="json",
        )

        self.client.force_authenticate(user=self.user)
        cancel_response = self.client.post(f"/api/orders/{order.pk}/cancel/")

        self.assertEqual(callback_response.status_code, 200)
        self.assertEqual(cancel_response.status_code, 400)
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(order.status, self.order_processing)
        self.assertEqual(self.product_item.qty_in_stock, 3)

    def test_vnpay_rejects_invalid_signature_without_changing_data(self):
        order, payment = self.create_order_and_payment(self.vnpay_method)
        response = self.client.post(
            "/api/payments/vnpay/callback/",
            {
                "vnp_Amount": "10000000",
                "vnp_ResponseCode": "00",
                "vnp_TmnCode": "TESTMERCHANT",
                "vnp_TransactionNo": "VNPAY-INVALID-001",
                "vnp_TransactionStatus": "00",
                "vnp_TxnRef": str(payment.pk),
                "vnp_SecureHash": "invalid-signature",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        payment.refresh_from_db()
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(payment.status, self.payment_pending)
        self.assertEqual(order.status, self.order_pending)
        self.assertEqual(self.product_item.qty_in_stock, 3)

    def test_stripe_success_webhook_updates_foreign_key_statuses(self):
        order, payment = self.create_order_and_payment(
            self.stripe_method,
            transaction_id="pi_test_success_001",
        )
        payload = json.dumps(
            {
                "id": "evt_test_success_001",
                "object": "event",
                "type": "payment_intent.succeeded",
                "data": {
                    "object": {
                        "id": "pi_test_success_001",
                        "object": "payment_intent",
                        "amount": 100000,
                        "currency": "vnd",
                        "metadata": {
                            "payment_id": str(payment.pk),
                            "order_id": str(order.pk),
                        },
                    }
                },
            },
            separators=(",", ":"),
        )

        response = self.client.generic(
            "POST",
            "/api/payments/stripe/webhook/",
            payload,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE=self.stripe_signature(payload),
        )

        self.assertEqual(response.status_code, 200)
        payment.refresh_from_db()
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(payment.status, self.payment_paid)
        self.assertEqual(order.status, self.order_processing)
        self.assertEqual(self.product_item.qty_in_stock, 3)

    def test_stripe_rejects_amount_mismatch_and_rolls_back(self):
        order, payment = self.create_order_and_payment(
            self.stripe_method,
            transaction_id="pi_test_amount_001",
        )
        payload = json.dumps(
            {
                "id": "evt_test_amount_001",
                "object": "event",
                "type": "payment_intent.succeeded",
                "data": {
                    "object": {
                        "id": "pi_test_amount_001",
                        "object": "payment_intent",
                        "amount": 1,
                        "currency": "vnd",
                        "metadata": {
                            "payment_id": str(payment.pk),
                            "order_id": str(order.pk),
                        },
                    }
                },
            },
            separators=(",", ":"),
        )

        response = self.client.generic(
            "POST",
            "/api/payments/stripe/webhook/",
            payload,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE=self.stripe_signature(payload),
        )

        self.assertEqual(response.status_code, 400)
        payment.refresh_from_db()
        order.refresh_from_db()
        self.product_item.refresh_from_db()
        self.assertEqual(payment.status, self.payment_pending)
        self.assertEqual(order.status, self.order_pending)
        self.assertEqual(self.product_item.qty_in_stock, 3)
