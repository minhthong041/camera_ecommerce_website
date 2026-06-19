from django.urls import path

from .views import ProductReviewListAPIView, ReviewViewSet


app_name = "reviews"

review_create = ReviewViewSet.as_view({"post": "create"})
review_detail = ReviewViewSet.as_view(
    {
        "patch": "partial_update",
        "delete": "destroy",
    }
)

urlpatterns = [
    path(
        "products/<int:product_id>/reviews/",
        ProductReviewListAPIView.as_view(),
        name="product-review-list",
    ),
    path("reviews/", review_create, name="review-create"),
    path("reviews/<int:pk>/", review_detail, name="review-detail"),
]
