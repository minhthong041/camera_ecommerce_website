from django.db import models


class ShippingMethod(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    class Meta:
        db_table = "shipping_methods"
        verbose_name = "shipping_method"
        verbose_name_plural = "shipping_methods"

    def __str__(self):
        return self.name


class OrderStatus(models.Model):
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "order_statuses"
        verbose_name = "order_status"
        verbose_name_plural = "order_statuses"

    def __str__(self):
        return self.name


class Order(models.Model):
    order_code = models.CharField(max_length=100, unique=True)
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="orders",
    )
    shipping_method = models.ForeignKey(
        ShippingMethod,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    shipping_address = models.ForeignKey(
        "locations.Address",
        on_delete=models.PROTECT,
        related_name="orders",
    )
    promotion = models.ForeignKey(
        "promotions.Promotion",
        on_delete=models.SET_NULL,
        related_name="orders",
        null=True,
        blank=True,
    )
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.ForeignKey(
        OrderStatus,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "orders"
        verbose_name = "order"
        verbose_name_plural = "orders"

    def __str__(self):
        return self.order_code


class OrderLine(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="lines",
    )
    product_item = models.ForeignKey(
        "catalog.ProductItem",
        on_delete=models.PROTECT,
        related_name="order_lines",
    )
    price = models.DecimalField(max_digits=15, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "order_lines"
        verbose_name = "order_line"
        verbose_name_plural = "order_lines"

    def __str__(self):
        return f"{self.order} - {self.product_item}"
