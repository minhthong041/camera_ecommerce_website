from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from accounts.models import Role, User
from catalog.models import Brand, Category, Product, ProductItem
from inventory.models import InventoryLedgerEntry
from orders.models import ShippingMethod
from payments.models import PaymentMethod
from promotions.models import DiscountType, Promotion

from .authentication import RoleAwareJWTAuthentication
from .views import DELETE_CONFLICT_MESSAGE, ShippingMethodViewSet


class AdminManagementAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_role = Role.objects.create(name="admin")
        self.staff_role = Role.objects.create(name="staff")
        self.customer_role = Role.objects.create(name="customer")

        self.admin = self.create_user("admin", self.admin_role)
        self.staff = self.create_user("staff", self.staff_role)
        self.customer = self.create_user("customer", self.customer_role)

        self.brand = Brand.objects.create(name="Canon")
        self.category = Category.objects.create(name="Cameras", slug="cameras")
        self.product = Product.objects.create(
            category=self.category,
            brand=self.brand,
            name="Canon EOS R5",
            description="Full-frame mirrorless camera",
            tech_specs={"sensor": "45MP"},
        )
        self.product_item = ProductItem.objects.create(
            product=self.product,
            sku="EOS-R5-BODY",
            price=Decimal("89990000.00"),
            qty_in_stock=4,
            condition="New",
        )
        self.discount_type = DiscountType.objects.create(name="percentage")
        self.promotion = Promotion.objects.create(
            code="CAMERA10",
            name="Camera discount",
            discount_type=self.discount_type,
            discount_value=Decimal("10.00"),
            min_order_value=Decimal("1000000.00"),
            max_discount=Decimal("5000000.00"),
            start_date=timezone.now() - timedelta(days=1),
            end_date=timezone.now() + timedelta(days=7),
            usage_limit=100,
        )

    @staticmethod
    def create_user(username, role):
        return User.objects.create_user(
            username=username,
            full_name=username.title(),
            password="StrongPass123!",
            role=role,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_unauthenticated_and_customer_users_are_blocked(self):
        response = self.client.get("/api/admin/products/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.authenticate(self.customer)
        response = self.client.get("/api/admin/products/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_list_create_and_update_products(self):
        self.authenticate(self.staff)

        list_response = self.client.get("/api/admin/products/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data[0]["tech_specs"], {"sensor": "45MP"})

        create_response = self.client.post(
            "/api/admin/products/",
            {
                "category": self.category.pk,
                "brand": self.brand.pk,
                "name": "Canon EOS R6",
                "description": "Hybrid mirrorless camera",
                "tech_specs": {"sensor": "24MP"},
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        update_response = self.client.patch(
            f"/api/admin/products/{create_response.data['id']}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertFalse(update_response.data["is_active"])

    def test_staff_cannot_delete_resources(self):
        self.authenticate(self.staff)
        response = self.client.delete(
            f"/api/admin/product-items/{self.product_item.pk}/"
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(ProductItem.objects.filter(pk=self.product_item.pk).exists())

    def test_admin_has_full_crud_access(self):
        self.authenticate(self.admin)
        create_response = self.client.post(
            "/api/admin/payment-methods/",
            {"name": "Bank transfer", "description": "Manual transfer"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        payment_method_id = create_response.data["id"]
        update_response = self.client.patch(
            f"/api/admin/payment-methods/{payment_method_id}/",
            {"description": "Verified bank transfer"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        delete_response = self.client.delete(
            f"/api/admin/payment-methods/{payment_method_id}/"
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PaymentMethod.objects.filter(pk=payment_method_id).exists())

    def test_update_stock_action_only_accepts_quantity(self):
        self.authenticate(self.staff)
        url = f"/api/admin/product-items/{self.product_item.pk}/stock/"

        response = self.client.patch(url, {"qty_in_stock": 25}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["qty_in_stock"], 25)
        self.product_item.refresh_from_db()
        self.assertEqual(self.product_item.qty_in_stock, 25)
        ledger_entry = InventoryLedgerEntry.objects.get(
            product_item=self.product_item
        )
        self.assertEqual(ledger_entry.quantity_change, 21)
        self.assertEqual(ledger_entry.quantity_before, 4)
        self.assertEqual(ledger_entry.quantity_after, 25)

        invalid_response = self.client.patch(
            url,
            {"qty_in_stock": 30, "price": "1.00"},
            format="json",
        )
        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.product_item.refresh_from_db()
        self.assertEqual(self.product_item.qty_in_stock, 25)

    def test_safe_destroy_returns_400_for_referenced_data(self):
        self.authenticate(self.admin)
        shipping_method = ShippingMethod.objects.create(
            name="Express",
            price=Decimal("50000.00"),
        )

        with patch.object(
            ShippingMethodViewSet,
            "perform_destroy",
            side_effect=IntegrityError,
        ):
            response = self.client.delete(
                f"/api/admin/shipping-methods/{shipping_method.pk}/"
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], DELETE_CONFLICT_MESSAGE)
        self.assertTrue(ShippingMethod.objects.filter(pk=shipping_method.pk).exists())

    def test_admin_resource_routes_return_full_data(self):
        self.authenticate(self.admin)
        routes = (
            "/api/admin/products/",
            "/api/admin/product-items/",
            "/api/admin/promotions/",
            "/api/admin/payment-methods/",
            "/api/admin/shipping-methods/",
        )

        for route in routes:
            with self.subTest(route=route):
                response = self.client.get(route)
                self.assertEqual(response.status_code, status.HTTP_200_OK)

        promotion_response = self.client.get(
            f"/api/admin/promotions/{self.promotion.pk}/"
        )
        self.assertEqual(promotion_response.data["usage_limit"], 100)
        self.assertEqual(
            promotion_response.data["discount_type_name"],
            "percentage",
        )

    def test_staff_can_access_admin_order_management(self):
        self.authenticate(self.staff)
        response = self.client.get("/api/admin/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.authenticate(self.customer)
        response = self.client.get("/api/admin/orders/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_jwt_authentication_fetches_user_and_role_in_one_query(self):
        token = AccessToken.for_user(self.admin)
        authentication = RoleAwareJWTAuthentication()

        with self.assertNumQueries(1):
            user = authentication.get_user(token)
            self.assertEqual(user.role.name, "admin")

