from django.db import migrations, models
from django.db.models import F, Q
from django.db.models.functions import Lower


def normalize_promotion_codes(apps, schema_editor):
    Promotion = apps.get_model("promotions", "Promotion")
    seen_codes = set()

    for promotion in Promotion.objects.exclude(code__isnull=True).order_by("id"):
        normalized_code = promotion.code.strip().upper() if promotion.code else None
        if not normalized_code:
            promotion.code = None
            promotion.save(update_fields=("code",))
            continue
        if normalized_code in seen_codes:
            raise RuntimeError(
                f"Duplicate promotion code after normalization: {normalized_code}"
            )
        seen_codes.add(normalized_code)
        if promotion.code != normalized_code:
            promotion.code = normalized_code
            promotion.save(update_fields=("code",))


class Migration(migrations.Migration):
    dependencies = [
        ("promotions", "0002_alter_discounttype_options_alter_promotion_options_and_more"),
    ]

    operations = [
        migrations.RunPython(normalize_promotion_codes, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="promotion",
            constraint=models.UniqueConstraint(
                Lower("code"),
                condition=Q(code__isnull=False),
                name="promotions_code_case_insensitive_unique",
            ),
        ),
        migrations.AddConstraint(
            model_name="promotion",
            constraint=models.CheckConstraint(
                condition=Q(end_date__gt=F("start_date")),
                name="promotions_end_after_start",
            ),
        ),
        migrations.AddConstraint(
            model_name="promotion",
            constraint=models.CheckConstraint(
                condition=Q(discount_value__gt=0),
                name="promotions_discount_value_positive",
            ),
        ),
        migrations.AddConstraint(
            model_name="promotion",
            constraint=models.CheckConstraint(
                condition=Q(min_order_value__isnull=True)
                | Q(min_order_value__gte=0),
                name="promotions_min_order_value_non_negative",
            ),
        ),
        migrations.AddConstraint(
            model_name="promotion",
            constraint=models.CheckConstraint(
                condition=Q(max_discount__isnull=True) | Q(max_discount__gt=0),
                name="promotions_max_discount_positive",
            ),
        ),
    ]
