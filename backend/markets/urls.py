from django.urls import path
from . import views

urlpatterns = [
    # WALLET FIRST (so "wallet/" does NOT get caught by <str:coin_id>/)
    path("wallet/", views.spot_wallet),
    path("wallet/deposit/", views.deposit),
    path("wallet/withdraw/", views.withdraw),
    path("wallet/buy/", views.buy),
    path("wallet/sell/", views.sell),
    path("wallet/convert/", views.convert),
    path("convert-preview/", views.convert_preview),

    # MARKETS
    path("top100/", views.top_100),
    path("top8/", views.top8),

    # MUST BE LAST – catches anything else as a coin_id
    path("<str:coin_id>/", views.market_detail),
]