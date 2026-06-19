from django.urls import path

from . import views


app_name = "wishlist"

urlpatterns = [
    path("", views.WishlistView.as_view(), name="wishlist-list-create"),
    path(
        "<int:product_item_id>/",
        views.WishlistDetailView.as_view(),
        name="wishlist-delete",
    ),
]
