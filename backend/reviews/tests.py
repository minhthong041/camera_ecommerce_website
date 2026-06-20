from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Role, User
from catalog.models import Brand, Category, Product, ProductItem
from locations.models import Address, City, Country, District, Province, Ward
from orders.models import Order, OrderLine, OrderStatus, ShippingMethod

from .models import Review


class ReviewAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin_role = Role.objects.create(name="admin")
        cls.staff_role = Role.objects.create(name="staff")
        cls.admin = User.objects.create_user(
            username="review-admin",
            full_name="Review Admin",
            password="StrongPassword123!",
            role=cls.admin_role,
        )
        cls.staff = User.objects.create_user(
            username="review-staff",
            full_name="Review Staff",
            password="StrongPassword123!",
            role=cls.staff_role,
        )
        cls.customer = User.objects.create_user(
            username="customer",
            email="customer@example.com",
            full_name="Nguyen Van An",
            password="StrongPassword123!",
        )
        cls.other_customer = User.objects.create_user(
            username="other-customer",
            email="other@example.com",
            full_name="Tran Thi Binh",
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
        cls.product = Product.objects.create(
            category=category,
            brand=brand,
            name="Test Camera",
            is_active=True,
        )
        cls.other_product = Product.objects.create(
            category=category,
            brand=brand,
            name="Other Camera",
            is_active=True,
        )
        cls.product_item = ProductItem.objects.create(
            product=cls.product,
            sku="CAM-001",
            price=Decimal("100000.00"),
            qty_in_stock=10,
        )
        cls.other_product_item = ProductItem.objects.create(
            product=cls.other_product,
            sku="CAM-002",
            price=Decimal("200000.00"),
            qty_in_stock=10,
        )

        cls.shipping_method = ShippingMethod.objects.create(
            name="standard",
            price=Decimal("30000.00"),
        )
        cls.delivered_status = OrderStatus.objects.create(name="delivered")
        cls.pending_status = OrderStatus.objects.create(name="pending")

        cls.customer_delivered_order = cls.create_order(
            user=cls.customer,
            status=cls.delivered_status,
            order_code="ORD-CUSTOMER-DELIVERED",
        )
        customer_pending_order = cls.create_order(
            user=cls.customer,
            status=cls.pending_status,
            order_code="ORD-CUSTOMER-PENDING",
        )
        other_delivered_order = cls.create_order(
            user=cls.other_customer,
            status=cls.delivered_status,
            order_code="ORD-OTHER-DELIVERED",
        )

        cls.customer_line = cls.create_order_line(
            cls.customer_delivered_order,
            cls.product_item,
        )
        cls.customer_second_line = cls.create_order_line(
            cls.customer_delivered_order,
            cls.product_item,
        )
        cls.pending_line = cls.create_order_line(
            customer_pending_order,
            cls.product_item,
        )
        cls.other_line = cls.create_order_line(
            other_delivered_order,
            cls.product_item,
        )
        other_product_line = cls.create_order_line(
            other_delivered_order,
            cls.other_product_item,
        )

        cls.other_review = Review.objects.create(
            user=cls.other_customer,
            product_item=cls.product_item,
            order_line=cls.other_line,
            rating=5,
            comment="Excellent camera",
        )
        Review.objects.create(
            user=cls.other_customer,
            product_item=cls.other_product_item,
            order_line=other_product_line,
            rating=2,
            comment="Not for me",
        )

    @classmethod
    def create_order(cls, *, user, status, order_code):
        return Order.objects.create(
            order_code=order_code,
            user=user,
            shipping_method=cls.shipping_method,
            shipping_address=cls.address,
            total_amount=Decimal("230000.00"),
            status=status,
        )

    @staticmethod
    def create_order_line(order, product_item):
        return OrderLine.objects.create(
            order=order,
            product_item=product_item,
            price=product_item.price,
            quantity=1,
        )

    def setUp(self):
        self.client = APIClient()

    def authenticate_customer(self):
        self.client.force_authenticate(user=self.customer)

    def test_public_product_reviews_are_paginated_and_include_average(self):
        Review.objects.create(
            user=self.customer,
            product_item=self.product_item,
            order_line=self.customer_line,
            rating=3,
            comment="Good camera",
        )

        response = self.client.get(f"/api/products/{self.product.pk}/reviews/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(response.data["average_rating"], 4.0)
        self.assertEqual(len(response.data["results"]), 2)
        first_review = response.data["results"][0]
        self.assertIn("created_at", first_review)
        self.assertIn("display_name", first_review["user"])
        self.assertNotIn("email", first_review["user"])
        self.assertNotIn("username", first_review["user"])
        self.assertNotEqual(
            first_review["user"]["display_name"],
            self.customer.full_name,
        )

    def test_hidden_reviews_are_excluded_from_public_product_reviews(self):
        self.other_review.is_visible = False
        self.other_review.save(update_fields=("is_visible",))

        response = self.client.get(f"/api/products/{self.product.pk}/reviews/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["average_rating"], 0.0)

    def test_create_review_for_delivered_owned_order_line(self):
        self.authenticate_customer()

        response = self.client.post(
            "/api/reviews/",
            {
                "order_line_id": self.customer_line.pk,
                "rating": 4,
                "comment": "Very good",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        review = Review.objects.get(order_line=self.customer_line)
        self.assertEqual(review.user, self.customer)
        self.assertEqual(review.product_item, self.customer_line.product_item)
        self.assertEqual(response.data["product_item"]["id"], self.product_item.pk)

        order_response = self.client.get(
            f"/api/orders/{self.customer_delivered_order.pk}/"
        )
        reviewed_line = next(
            line
            for line in order_response.data["order_lines"]
            if line["id"] == self.customer_line.pk
        )
        self.assertEqual(reviewed_line["review"]["id"], review.pk)
        self.assertEqual(reviewed_line["review"]["rating"], 4)

    def test_cannot_review_another_users_order_line(self):
        self.authenticate_customer()

        response = self.client.post(
            "/api/reviews/",
            {
                "order_line_id": self.other_line.pk,
                "rating": 4,
                "comment": "Invalid",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            str(response.data["order_line_id"][0]),
            "You can only review items from your own orders.",
        )

    def test_cannot_review_item_before_delivery(self):
        self.authenticate_customer()

        response = self.client.post(
            "/api/reviews/",
            {
                "order_line_id": self.pending_line.pk,
                "rating": 4,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            str(response.data["order_line_id"][0]),
            "You can only review delivered items.",
        )

    def test_cannot_review_same_order_line_twice(self):
        Review.objects.create(
            user=self.customer,
            product_item=self.product_item,
            order_line=self.customer_line,
            rating=4,
        )
        self.authenticate_customer()

        response = self.client.post(
            "/api/reviews/",
            {
                "order_line_id": self.customer_line.pk,
                "rating": 5,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            str(response.data["order_line_id"][0]),
            "This order line has already been reviewed.",
        )

    def test_rating_must_be_between_one_and_five(self):
        self.authenticate_customer()

        for rating in (0, 6):
            with self.subTest(rating=rating):
                response = self.client.post(
                    "/api/reviews/",
                    {
                        "order_line_id": self.customer_line.pk,
                        "rating": rating,
                    },
                    format="json",
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn("rating", response.data)

    def test_owner_can_patch_review_but_cannot_change_order_line(self):
        review = Review.objects.create(
            user=self.customer,
            product_item=self.product_item,
            order_line=self.customer_line,
            rating=3,
        )
        self.authenticate_customer()

        response = self.client.patch(
            f"/api/reviews/{review.pk}/",
            {"rating": 5, "comment": "Updated"},
            format="json",
        )
        change_line_response = self.client.patch(
            f"/api/reviews/{review.pk}/",
            {"order_line_id": self.customer_second_line.pk},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["rating"], 5)
        self.assertEqual(change_line_response.status_code, 400)
        review.refresh_from_db()
        self.assertEqual(review.order_line, self.customer_line)

    def test_user_cannot_patch_or_delete_another_users_review(self):
        self.authenticate_customer()

        patch_response = self.client.patch(
            f"/api/reviews/{self.other_review.pk}/",
            {"rating": 1},
            format="json",
        )
        delete_response = self.client.delete(
            f"/api/reviews/{self.other_review.pk}/"
        )

        self.assertEqual(patch_response.status_code, 404)
        self.assertEqual(delete_response.status_code, 404)
        self.assertTrue(Review.objects.filter(pk=self.other_review.pk).exists())

    def test_owner_can_delete_review(self):
        review = Review.objects.create(
            user=self.customer,
            product_item=self.product_item,
            order_line=self.customer_line,
            rating=4,
        )
        self.authenticate_customer()

        response = self.client.delete(f"/api/reviews/{review.pk}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Review.objects.filter(pk=review.pk).exists())

    def test_authentication_is_required_to_create_review(self):
        response = self.client.post(
            "/api/reviews/",
            {
                "order_line_id": self.customer_line.pk,
                "rating": 4,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 401)

    def test_staff_can_hide_review_but_cannot_delete_it(self):
        self.client.force_authenticate(user=self.staff)

        update_response = self.client.patch(
            f"/api/admin/reviews/{self.other_review.pk}/",
            {"is_visible": False},
            format="json",
        )
        delete_response = self.client.delete(
            f"/api/admin/reviews/{self.other_review.pk}/"
        )

        self.assertEqual(update_response.status_code, 200)
        self.assertFalse(update_response.data["is_visible"])
        self.assertEqual(delete_response.status_code, 403)
        self.assertTrue(Review.objects.filter(pk=self.other_review.pk).exists())

    def test_admin_can_filter_and_delete_reviews(self):
        self.client.force_authenticate(user=self.admin)

        list_response = self.client.get(
            "/api/admin/reviews/",
            {"rating": 5, "visibility": "visible", "search": "Test Camera"},
        )
        delete_response = self.client.delete(
            f"/api/admin/reviews/{self.other_review.pk}/"
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["order_code"], "ORD-OTHER-DELIVERED")
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(Review.objects.filter(pk=self.other_review.pk).exists())

    def test_admin_review_filter_rejects_invalid_rating(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get("/api/admin/reviews/", {"rating": "invalid"})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(str(response.data["rating"]), "Rating must be an integer.")
