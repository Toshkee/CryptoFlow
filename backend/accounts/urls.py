from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    signup,
    login,
    me,
    logout,
    update_profile,
    change_password,
    upload_profile_picture,
)

urlpatterns = [
    path("signup/", signup),
    path("login/", login),
    path("me/", me),
    path("logout/", logout),

    # profile
    path("profile/update/", update_profile),
    path("change-password/", change_password),
    path("upload-picture/", upload_profile_picture),

    # JWT REQUIRED ENDPOINTS
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]