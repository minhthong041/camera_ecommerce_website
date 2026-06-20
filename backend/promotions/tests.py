from datetime import timedelta
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from admin_dashboard.serializers import AdminPromotionSerializer
from cart.models import CartItem, ShoppingCart
from catalog.models import Brand, Category, Product, ProductItem
from locations.models import (
    Address,
    City,
    Country,
    District,
    Province,
    UserAddress,
    Ward,
)
from orders.models import Order, OrderStatus, ShippingMethod
from payments.models import PaymentMethod, PaymentStatus

from .models import DiscountType, Promotion, PromotionCategory, PromotionUser


class PromotionRulesAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="promotion-user",
            email="promotion@example.com",
            full_name="Promotion User",
            password="StrongPassword123!",
        )
        cls.other_user = User.objects.create_user(
            username="other-promotion-user",
            email="other-promotion@example.com",
            full_name="Other Promotion User",
            password="StrongPassword123!",
        )

        brand = Brand.objects.create(name="Promotion Brand")
        cls.camera_category = Category.objects.create(
            name="Cameras",
            slug="promotion-cameras",
        )
        cls.accessory_category = Category.objects.create(
            name="Accessories",
            slug="promotion-accessories",
        )
        camera = Product.objects.create(
            category=cls.camera_category,
            brand=brand,
            name="Promotion Camera",
        )
        accessory = Product.objects.create(
            category=cls.accessory_category,
            brand=brand,
            name="Promotion Accessory",
        )
        cls.camera_item = ProductItem.objects.create(
            product=camera,
            sku="PROMO-CAMERA",
            price=Decimal("100.00"),
            qty_in_stock=10,
        )
        cls.accessory_item = ProductItem.objects.create(
            product=accessory,
            sku="PROMO-ACCESSORY",
            price=Decimal("200.00"),
            qty_in_stock=10,
        )

        cart = ShoppingCart.objects.create(user=cls.user)
        CartItem.objects.create(cart=cart, product_item=cls.camera_item, quantity=1)
        CartItem.objects.create(cart=cart, product_item=cls.accessory_item, quantity=1)

        cls.percentage_type = DiscountType.objects.create(name="percentage")
        cls.fixed_type = DiscountType.objects.create(name="fixed_amount")

        country = Country.objects.create(name="Vietnam", iso_code="VN")
        province = Province.objects.create(country=country, name="Promotion Province")
        city = City.objects.create(province=province, name="Promotion City")
        district = District.objects.create(city=city, name="Promotion District")
        ward = Ward.objects.create(district=district, name="Promotion Ward")
        cls.address = Address.objects.create(address_line1="1 Promotion Street", ward=ward)
        UserAddress.objects.create(
            user=cls.user,
            address=cls.address,
            is_default=True,
        )
        cls.shipping_method = ShippingMethod.objects.create(
            name="Promotion Shipping",
            price=Decimal("10.00"),
        )
        cls.pending_status = OrderStatus.objects.create(name="pending")
        OrderStatus.objects.create(name="confirmed")
        cls.cancelled_status = OrderStatus.objects.create(name="cancelled")
        PaymentStatus.objects.create(name="pending")
        cls.cod_method = PaymentMethod.objects.create(
            name="COD",
            description="Cash on delivery",
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def create_promotion(self, **overrides):
        now = timezone.now()
        defaults = {
            "code": "CAMERA10",
            "name": "Camera discount",
            "discount_type": self.percentage_type,
            "discount_value": Decimal("10.00"),
            "min_order_value": Decimal("0.00"),
            "max_discount": None,
            "start_date": now - timedelta(days=1),
            "end_date": now + timedelta(days=1),
            "usage_limit": None,
        }
        defaults.update(overrides)
        return Promotion.objects.create(**defaults)

    def apply(self, code="CAMERA10", cart_total="300.00"):
        return self.client.post(
            "/api/promotions/apply/",
            {"code": code, "cart_total": cart_total},
            format="json",
        )

    def test_category_rule_discounts_only_eligible_items(self):
        promotion = self.create_promotion()
        PromotionCategory.objects.create(
            promotion=promotion,
            category=self.camera_category,
        )

        response = self.apply()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["subtotal"], "300.00")
        self.assertEqual(response.data["eligible_subtotal"], "100.00")
        self.assertEqual(response.data["discount_amount"], "10.00")
        self.assertEqual(response.data["final_total"], "290.00")

    def test_restricted_promotion_rejects_unassigned_user(self):
        promotion = self.create_promotion()
        PromotionUser.objects.create(
            promotion=promotion,
            user=self.other_user,
        )

        response = self.apply()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            str(response.data["code"][0]),
            "Promotion code is not available for this user.",
        )

    def test_client_cannot_forge_cart_total(self):
        self.create_promotion()

        response = self.apply(cart_total="1.00")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            str(response.data["cart_total"][0]),
            "Cart total does not match the current cart subtotal.",
        )

    def test_usage_limit_ignores_cancelled_orders_but_counts_active_orders(self):
        promotion = self.create_promotion(usage_limit=1)
        order = Order.objects.create(
            order_code="PROMO-USAGE-1",
            user=self.user,
            shipping_method=self.shipping_method,
            shipping_address=self.address,
            promotion=promotion,
            total_amount=Decimal("300.00"),
            status=self.cancelled_status,
        )

        allowed_response = self.apply()
        order.status = self.pending_status
        order.save(update_fields=("status",))
        blocked_response = self.apply()

        self.assertEqual(allowed_response.status_code, 200)
        self.assertEqual(blocked_response.status_code, 400)
        self.assertEqual(
            str(blocked_response.data["code"][0]),
            "Promotion usage limit has been reached.",
        )

    def test_fixed_discount_respects_category_subtotal_and_max_discount(self):
        promotion = self.create_promotion(
            code="FIXED",
            discount_type=self.fixed_type,
            discount_value=Decimal("150.00"),
            max_discount=Decimal("80.00"),
        )
        PromotionCategory.objects.create(
            promotion=promotion,
            category=self.camera_category,
        )

        response = self.apply(code="fixed")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["discount_amount"], "80.00")

    def test_codes_are_normalized_and_case_insensitively_unique(self):
        first = self.create_promotion(code="  camera10  ")
        self.assertEqual(first.code, "CAMERA10")

        with self.assertRaises(IntegrityError), transaction.atomic():
            self.create_promotion(code="camera10")

    def test_checkout_uses_the_same_category_promotion_rules(self):
        promotion = self.create_promotion()
        PromotionCategory.objects.create(
            promotion=promotion,
            category=self.camera_category,
        )

        response = self.client.post(
            "/api/orders/checkout/",
            {
                "shipping_address_id": self.address.pk,
                "shipping_method_id": self.shipping_method.pk,
                "payment_method_id": self.cod_method.pk,
                "promotion_code": "camera10",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["promotion_id"], promotion.pk)
        self.assertEqual(response.data["total_amount"], "300.00")

    def test_admin_serializer_can_replace_category_and_user_rules(self):
        promotion = self.create_promotion()
        serializer = AdminPromotionSerializer(
            promotion,
            data={
                "category_ids": [self.camera_category.pk],
                "user_ids": [self.user.pk],
            },
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_promotion = serializer.save()
        response_data = AdminPromotionSerializer(updated_promotion).data

        self.assertEqual(response_data["category_ids"], [self.camera_category.pk])
        self.assertEqual(response_data["user_ids"], [self.user.pk])

    def test_admin_serializer_rejects_percentage_above_one_hundred(self):
        promotion = self.create_promotion()
        serializer = AdminPromotionSerializer(
            promotion,
            data={"discount_value": "101.00"},
            partial=True,
        )

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            str(serializer.errors["discount_value"][0]),
            "Percentage discount cannot exceed 100.",
        )
