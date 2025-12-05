from django.urls import path
from .views import open_position, get_open_positions, close_position, get_wallet

urlpatterns = [
    path("open/", open_position),
    path("positions/", get_open_positions),
    path("close/<int:position_id>/", close_position),
    path("wallet/", get_wallet),
]