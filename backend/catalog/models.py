from django.db import models


class Brand(models.Model):
    name = models.CharField(max_length=100, unique=True)
    logo_url = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "brands"
        verbose_name = "brand"
        verbose_name_plural = "brands"

    def __str__(self):
        return self.name


class Category(models.Model):
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="children",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "categories"
        verbose_name = "category"
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )
    brand = models.ForeignKey(
        Brand,
        on_delete=models.PROTECT,
        related_name="products",
    )
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(null=True, blank=True)
    tech_specs = models.JSONField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = "products"
        verbose_name = "product"
        verbose_name_plural = "products"

    def __str__(self):
        return self.name


class ProductItem(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="items",
    )
    sku = models.CharField(max_length=100, unique=True)
    price = models.DecimalField(max_digits=15, decimal_places=2, db_index=True)
    qty_in_stock = models.PositiveIntegerField(default=0)
    condition = models.CharField(max_length=50, default="New")
    product_image = models.ImageField(
        upload_to="products/",
        max_length=255,
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "product_items"
        verbose_name = "product_item"
        verbose_name_plural = "product_items"

    def __str__(self):
        return self.sku


class Variation(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="variations",
    )
    name = models.CharField(max_length=100)

    class Meta:
        db_table = "variations"
        verbose_name = "variation"
        verbose_name_plural = "variations"

    def __str__(self):
        return self.name


class VariationOption(models.Model):
    variation = models.ForeignKey(
        Variation,
        on_delete=models.CASCADE,
        related_name="options",
    )
    value = models.CharField(max_length=100)

    class Meta:
        db_table = "variation_options"
        verbose_name = "variation_option"
        verbose_name_plural = "variation_options"

    def __str__(self):
        return f"{self.variation}: {self.value}"


class ProductConfiguration(models.Model):
    product_item = models.ForeignKey(
        ProductItem,
        on_delete=models.CASCADE,
        related_name="configurations",
    )
    variation_option = models.ForeignKey(
        VariationOption,
        on_delete=models.CASCADE,
        related_name="product_configurations",
    )

    class Meta:
        db_table = "product_configurations"
        verbose_name = "product_configuration"
        verbose_name_plural = "product_configurations"
        constraints = [
            models.UniqueConstraint(
                fields=["product_item", "variation_option"],
                name="product_configurations_item_option_unique",
            ),
        ]

    def __str__(self):
        return f"{self.product_item} - {self.variation_option}"
