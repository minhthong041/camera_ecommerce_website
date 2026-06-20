from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0003_returnrequest"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="returnrequest",
            constraint=models.UniqueConstraint(
                fields=("order",),
                name="return_requests_order_unique",
            ),
        ),
    ]
