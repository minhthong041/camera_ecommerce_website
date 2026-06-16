from decimal import Decimal

from django.core.management.base import BaseCommand

from accounts.models import Role
from catalog.models import Brand, Category, Variation, VariationOption
from orders.models import OrderStatus, ShippingMethod
from payments.models import PaymentMethod, PaymentStatus
from promotions.models import DiscountType


class Command(BaseCommand):
    help = "Seed initial lookup data for the camera ecommerce website."

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-demo-catalog",
            action="store_true",
            help="Seed demo brands, categories, and product variations.",
        )

    def handle(self, *args, **options):
        self.seed_roles()
        self.seed_order_statuses()
        self.seed_payment_statuses()
        self.seed_payment_methods()
        self.seed_discount_types()
        self.seed_shipping_methods()

        if options["with_demo_catalog"]:
            self.seed_demo_catalog()

        self.stdout.write(self.style.SUCCESS("Initial data seeded successfully."))

    def seed_roles(self):
        roles = ["admin", "staff", "customer"]

        for name in roles:
            Role.objects.get_or_create(name=name)

        self.stdout.write(self.style.SUCCESS("Seeded roles."))

    def seed_order_statuses(self):
        statuses = [
            "pending",
            "confirmed",
            "processing",
            "shipping",
            "completed",
            "cancelled",
        ]

        for name in statuses:
            OrderStatus.objects.get_or_create(name=name)

        self.stdout.write(self.style.SUCCESS("Seeded order statuses."))

    def seed_payment_statuses(self):
        statuses = [
            "pending",
            "paid",
            "failed",
            "refunded",
        ]

        for name in statuses:
            PaymentStatus.objects.get_or_create(name=name)

        self.stdout.write(self.style.SUCCESS("Seeded payment statuses."))

    def seed_payment_methods(self):
        methods = [
            {
                "name": "COD",
                "description": "Cash on delivery",
            },
            {
                "name": "bank_transfer",
                "description": "Bank transfer payment",
            },
            {
                "name": "momo",
                "description": "MoMo wallet payment",
            },
            {
                "name": "vnpay",
                "description": "VNPAY payment gateway",
            },
        ]

        for method in methods:
            PaymentMethod.objects.update_or_create(
                name=method["name"],
                defaults={
                    "description": method["description"],
                },
            )

        self.stdout.write(self.style.SUCCESS("Seeded payment methods."))

    def seed_discount_types(self):
        discount_types = [
            "percentage",
            "fixed_amount",
        ]

        for name in discount_types:
            DiscountType.objects.get_or_create(name=name)

        self.stdout.write(self.style.SUCCESS("Seeded discount types."))

    def seed_shipping_methods(self):
        methods = [
            {
                "name": "standard",
                "price": Decimal("30000.00"),
            },
            {
                "name": "express",
                "price": Decimal("60000.00"),
            },
        ]

        for method in methods:
            ShippingMethod.objects.update_or_create(
                name=method["name"],
                defaults={
                    "price": method["price"],
                },
            )

        self.stdout.write(self.style.SUCCESS("Seeded shipping methods."))

    def seed_demo_catalog(self):
        brands = [
            "Canon",
            "Sony",
            "Nikon",
            "Fujifilm",
            "Panasonic",
            "Sigma",
            "Tamron",
            "Kodak",
            "Olympus",
            "Leica",
        ]

        for name in brands:
            Brand.objects.get_or_create(name=name)

        camera_category, _ = Category.objects.update_or_create(
            slug="cameras",
            defaults={
                "name": "Camera",
                "description": "Camera products",
            },
        )

        lens_category, _ = Category.objects.update_or_create(
            slug="lenses",
            defaults={
                "name": "Lense",
                "description": "Camera lenses",
            },
        )

        accessory_category, _ = Category.objects.update_or_create(
            slug="accessories",
            defaults={
                "name": "Accessory",
                "description": "Camera accessories",
            },
        )

        self.create_variation(
            category=camera_category,
            name="Color",
            values=["Black", "Silver"],
        )

        self.create_variation(
            category=camera_category,
            name="Kit",
            values=["Body Only", "Lens Kit"],
        )

        self.create_variation(
            category=lens_category,
            name="Mount",
            values=["Sony E", "Canon RF", "Nikon Z", "Fujifilm X"],
        )

        self.create_variation(
            category=accessory_category,
            name="Storage",
            values=["64GB", "128GB", "256GB"],
        )

        self.stdout.write(self.style.SUCCESS("Seeded demo catalog data."))

    def create_variation(self, category, name, values):
        variation, _ = Variation.objects.get_or_create(
            category=category,
            name=name,
        )

        for value in values:
            VariationOption.objects.get_or_create(
                variation=variation,
                value=value,
            )