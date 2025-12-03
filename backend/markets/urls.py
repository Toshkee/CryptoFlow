from django.urls import path
from .views import top_100, market_detail

urlpatterns = [
    path("top100/", top_100),
    path("<str:coin_id>/", market_detail),
]