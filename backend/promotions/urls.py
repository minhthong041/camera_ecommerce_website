from django.urls import path

from .views import ApplyPromotionView


app_name = "promotions"

urlpatterns = [
    path("apply/", ApplyPromotionView.as_view(), name="apply-promotion"),
]
