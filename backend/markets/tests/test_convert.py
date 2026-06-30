"""
Tests for the spot-asset Convert endpoint.

Convert swaps one holding for another at authoritative server prices. The key
behaviours: it can target a coin the user does NOT yet hold (creating it), and
the new holding is labelled with the real ticker the client passes (so the UI
can map it to a live Binance feed) rather than a slug of the coin id.

`markets.views.get_spot_price` is monkeypatched via the `spot_price` fixture and
returns one fixed value for every coin, so both legs price equally and the math
stays exact.
"""

from decimal import Decimal

import pytest

from markets.models import SpotAsset

pytestmark = pytest.mark.django_db

DEPOSIT_URL = "/api/markets/wallet/deposit/"
BUY_URL = "/api/markets/wallet/buy/"
CONVERT_URL = "/api/markets/wallet/convert/"


def _seed_btc(auth_client, spot_price, usd="500", price="100"):
    """Deposit cash and buy BTC so there's a holding to convert from (5 BTC @ 100)."""
    spot_price.value = Decimal(price)
    auth_client.post(DEPOSIT_URL, {"amount": usd}, format="json")
    auth_client.post(
        BUY_URL,
        {"coin_id": "bitcoin", "symbol": "btc", "amount": usd},
        format="json",
    )


def test_convert_into_unheld_coin_creates_it_with_real_symbol(
    auth_client, user, spot_price
):
    _seed_btc(auth_client, spot_price)  # 5 BTC @ 100

    resp = auth_client.post(
        CONVERT_URL,
        {"from_coin": "bitcoin", "to_coin": "ethereum", "amount": "2", "to_symbol": "eth"},
        format="json",
    )
    assert resp.status_code == 200, resp.data

    eth = SpotAsset.objects.get(user=user, coin_id="ethereum")
    # Real ticker stored, NOT the "ETHER" slug from ethereum[:5].
    assert eth.symbol == "ETH"
    assert eth.amount == Decimal("2")  # equal prices -> 2 BTC becomes 2 ETH
    assert SpotAsset.objects.get(user=user, coin_id="bitcoin").amount == Decimal("3")


def test_convert_without_to_symbol_falls_back_to_slug(auth_client, user, spot_price):
    _seed_btc(auth_client, spot_price)

    resp = auth_client.post(
        CONVERT_URL,
        {"from_coin": "bitcoin", "to_coin": "ethereum", "amount": "1"},
        format="json",
    )
    assert resp.status_code == 200, resp.data
    eth = SpotAsset.objects.get(user=user, coin_id="ethereum")
    # No ticker supplied -> slug fallback, still a non-empty label.
    assert eth.symbol == "ETHER"


def test_convert_more_than_held_is_rejected(auth_client, user, spot_price):
    _seed_btc(auth_client, spot_price)  # 5 BTC

    resp = auth_client.post(
        CONVERT_URL,
        {"from_coin": "bitcoin", "to_coin": "ethereum", "amount": "9", "to_symbol": "eth"},
        format="json",
    )
    assert resp.status_code == 400
    # Nothing moved; no ETH created.
    assert not SpotAsset.objects.filter(user=user, coin_id="ethereum").exists()
    assert SpotAsset.objects.get(user=user, coin_id="bitcoin").amount == Decimal("5")


def test_convert_conserves_usd_value(auth_client, user, spot_price):
    _seed_btc(auth_client, spot_price)  # 5 BTC @ 100 = $500 of crypto

    auth_client.post(
        CONVERT_URL,
        {"from_coin": "bitcoin", "to_coin": "ethereum", "amount": "2", "to_symbol": "eth"},
        format="json",
    )

    price = Decimal("100")
    btc = SpotAsset.objects.get(user=user, coin_id="bitcoin")
    eth = SpotAsset.objects.get(user=user, coin_id="ethereum")
    assert btc.amount * price + eth.amount * price == Decimal("500")
