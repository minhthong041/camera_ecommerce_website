from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import AccountView, LoginView, LogoutView, ProfileView, RegisterView


app_name = "accounts"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("account/", AccountView.as_view(), name="account"),
]
