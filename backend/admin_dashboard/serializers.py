from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from accounts.models import Role, User
from catalog.models import Brand, Category, Product, ProductItem
from orders.models import ShippingMethod
from payments.models import PaymentMethod
from promotions.models import DiscountType, Promotion, PromotionCategory, PromotionUser
from reviews.models import Review


class AdminBrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = ("id", "name", "logo_url")


class AdminCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True)

    class Meta:
        model = Category
        fields = ("id", "parent", "parent_name", "name", "slug", "description")


class AdminDiscountTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountType
        fields = ("id", "name")


class AdminReviewSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    product_id = serializers.IntegerField(source="product_item.product_id", read_only=True)
    product_name = serializers.CharField(source="product_item.product.name", read_only=True)
    sku = serializers.CharField(source="product_item.sku", read_only=True)
    order_code = serializers.CharField(source="order_line.order.order_code", read_only=True)

    class Meta:
        model = Review
        fields = (
            "id",
            "user_id",
            "user_name",
            "user_email",
            "product_id",
            "product_name",
            "sku",
            "order_code",
            "rating",
            "comment",
            "is_visible",
            "created_at",
        )
        read_only_fields = (
            "id",
            "user_id",
            "user_name",
            "user_email",
            "product_id",
            "product_name",
            "sku",
            "order_code",
            "rating",
            "comment",
            "created_at",
        )


class ManagedUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=False,
        trim_whitespace=False,
    )
    role_name = serializers.CharField(source="role.name", read_only=True)
    managed_role_name = None

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "full_name",
            "email",
            "phone_number",
            "dob",
            "role_name",
            "is_active",
            "date_joined",
            "last_login",
            "password",
        )
        read_only_fields = ("id", "role_name", "date_joined", "last_login")
        extra_kwargs = {
            "username": {"required": False, "allow_null": True, "allow_blank": True},
            "email": {"required": True, "allow_null": False, "allow_blank": False},
            "phone_number": {
                "required": False,
                "allow_null": True,
                "allow_blank": True,
            },
        }

    def validate_password(self, value):
        validate_password(value, user=self.instance)
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "This field is required."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        role = Role.objects.filter(name__iexact=self.managed_role_name).first()
        if role is None:
            raise serializers.ValidationError(
                {"role": f"Role '{self.managed_role_name}' is not configured."}
            )
        user = User(role=role, **validated_data)
        user.is_staff = self.managed_role_name == "staff"
        user.is_superuser = False
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save(update_fields=("password",))
        return instance


class CustomerAccountSerializer(ManagedUserSerializer):
    managed_role_name = "customer"


class EmployeeAccountSerializer(ManagedUserSerializer):
    managed_role_name = "staff"


class AdminProductSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source="brand.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    sku_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "category",
            "category_name",
            "brand",
            "brand_name",
            "name",
            "description",
            "tech_specs",
            "is_active",
            "sku_count",
        )

    def validate_tech_specs(self, value):
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("Technical specifications must be an object.")
        return value


class AdminProductItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = ProductItem
        fields = (
            "id",
            "product",
            "product_name",
            "sku",
            "price",
            "qty_in_stock",
            "condition",
            "product_image",
        )

    def validate(self, attrs):
        if self.instance is not None and "qty_in_stock" in self.initial_data:
            raise serializers.ValidationError(
                {
                    "qty_in_stock": (
                        "Use the dedicated stock endpoint to change inventory."
                    )
                }
            )
        return attrs

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value


class StockUpdateSerializer(serializers.Serializer):
    qty_in_stock = serializers.IntegerField(min_value=0)
    note = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
    )

    def validate(self, attrs):
        unexpected_fields = set(self.initial_data) - {"qty_in_stock", "note"}
        if unexpected_fields:
            raise serializers.ValidationError(
                {
                    "non_field_errors": (
                        "Only qty_in_stock can be updated through this endpoint."
                    )
                }
            )
        return attrs


class AdminPromotionSerializer(serializers.ModelSerializer):
    discount_type_name = serializers.CharField(
        source="discount_type.name",
        read_only=True,
    )
    category_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        write_only=True,
    )
    user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Promotion
        fields = (
            "id",
            "code",
            "name",
            "discount_type",
            "discount_type_name",
            "discount_value",
            "min_order_value",
            "max_discount",
            "start_date",
            "end_date",
            "usage_limit",
            "is_exclusive",
            "category_ids",
            "user_ids",
        )

    def validate_category_ids(self, values):
        category_ids = set(values)
        existing_ids = set(
            Category.objects.filter(pk__in=category_ids).values_list("id", flat=True)
        )
        missing_ids = sorted(category_ids - existing_ids)
        if missing_ids:
            raise serializers.ValidationError(
                f"Categories do not exist: {missing_ids}."
            )
        return sorted(category_ids)

    def validate_user_ids(self, values):
        user_ids = set(values)
        existing_ids = set(
            User.objects.filter(pk__in=user_ids).values_list("id", flat=True)
        )
        missing_ids = sorted(user_ids - existing_ids)
        if missing_ids:
            raise serializers.ValidationError(f"Users do not exist: {missing_ids}.")
        return sorted(user_ids)

    def validate_code(self, value):
        if value is None or not value.strip():
            return None

        normalized_code = value.strip().upper()
        queryset = Promotion.objects.filter(code__iexact=normalized_code)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                "A promotion with this code already exists."
            )
        return normalized_code

    def validate(self, attrs):
        instance = self.instance
        discount_type = attrs.get(
            "discount_type",
            getattr(instance, "discount_type", None),
        )
        discount_value = attrs.get(
            "discount_value",
            getattr(instance, "discount_value", None),
        )
        start_date = attrs.get("start_date", getattr(instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(instance, "end_date", None))

        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be later than start date."}
            )
        if discount_value is not None and discount_value <= 0:
            raise serializers.ValidationError(
                {"discount_value": "Discount value must be greater than zero."}
            )
        if (
            discount_type
            and discount_type.name.strip().lower()
            in {"percentage", "percent", "percent_off"}
            and discount_value is not None
            and discount_value > 100
        ):
            raise serializers.ValidationError(
                {"discount_value": "Percentage discount cannot exceed 100."}
            )

        min_order_value = attrs.get(
            "min_order_value",
            getattr(instance, "min_order_value", None),
        )
        max_discount = attrs.get(
            "max_discount",
            getattr(instance, "max_discount", None),
        )
        usage_limit = attrs.get(
            "usage_limit",
            getattr(instance, "usage_limit", None),
        )
        if min_order_value is not None and min_order_value < 0:
            raise serializers.ValidationError(
                {"min_order_value": "Minimum order value cannot be negative."}
            )
        if max_discount is not None and max_discount <= 0:
            raise serializers.ValidationError(
                {"max_discount": "Maximum discount must be greater than zero."}
            )
        if usage_limit is not None and usage_limit < 1:
            raise serializers.ValidationError(
                {"usage_limit": "Usage limit must be at least one."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        category_ids = validated_data.pop("category_ids", None)
        user_ids = validated_data.pop("user_ids", None)
        promotion = super().create(validated_data)
        self._replace_rules(promotion, category_ids, user_ids)
        return promotion

    @transaction.atomic
    def update(self, instance, validated_data):
        category_ids = validated_data.pop("category_ids", None)
        user_ids = validated_data.pop("user_ids", None)
        promotion = super().update(instance, validated_data)
        self._replace_rules(promotion, category_ids, user_ids)
        return promotion

    @staticmethod
    def _replace_rules(promotion, category_ids, user_ids):
        if category_ids is not None:
            promotion.promotion_categories.all().delete()
            PromotionCategory.objects.bulk_create(
                [
                    PromotionCategory(promotion=promotion, category_id=category_id)
                    for category_id in category_ids
                ]
            )
        if user_ids is not None:
            promotion.promotion_users.all().delete()
            PromotionUser.objects.bulk_create(
                [
                    PromotionUser(promotion=promotion, user_id=user_id)
                    for user_id in user_ids
                ]
            )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["category_ids"] = sorted(
            relation.category_id
            for relation in instance.promotion_categories.all()
        )
        data["user_ids"] = sorted(
            relation.user_id for relation in instance.promotion_users.all()
        )
        return data


class AdminPaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ("id", "name", "description")


class AdminShippingMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShippingMethod
        fields = ("id", "name", "price")

