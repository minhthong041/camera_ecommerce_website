from django.urls import path

from .views import InventoryLedgerListAPIView


app_name = "inventory"

urlpatterns = [
    path("ledger/", InventoryLedgerListAPIView.as_view(), name="ledger-list"),
]
