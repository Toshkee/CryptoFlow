"""
Integration tests for the futures open/close endpoints.

The authoritative price helper (`futures.views.get_futures_price`) is
monkeypatched to a FIXED value via the `futures_price` fixture, so:
  * no real Binance call is ever made, and
  * we can prove the server settles at ITS price, never the client's.
"""

from decimal import Decimal

import pytest

from futures.models import FuturesPosition, FuturesWallet

pytestmark = pytest.mark.django_db

OPEN_URL = "/api/futures/open/"


def _wallet(user):
    return FuturesWallet.objects.get(user=user)


def _close_url(position_id):
    return f"/api/futures/close/{position_id}/"


# ---------------------------------------------------------------------------
# ANTI-EXPLOIT: the server price wins, the client-supplied price is ignored.
# ---------------------------------------------------------------------------
def test_open_uses_server_price_not_absurd_client_price(auth_client, user, futures_price):
    """A user cannot inject a fake entry price to mint PnL out of thin air.

    The request body carries an absurd `price`, but the position must record
    the SERVER price (the fixed fixture value), not the client's.
    """
    futures_price.value = Decimal("50000")

    resp = auth_client.post(
        OPEN_URL,
        {
            "symbol": "BTCUSDT",
            "side": "BUY",
            "margin": "1000",
            "leverage": 10,
            "price": "0.01",  # <-- absurd client price; MUST be ignored
        },
        format="json",
    )

    assert resp.status_code == 200, resp.data
    pos = FuturesPosition.objects.get(user=user)
    # Entry price is the server's, not the client's absurd 0.01.
    assert pos.entry_price == Decimal("50000")
    assert pos.entry_price != Decimal("0.01")


def test_open_deducts_margin_from_wallet(auth_client, user, futures_price):
    futures_price.value = Decimal("100")

    resp = auth_client.post(
        OPEN_URL,
        {"symbol": "BTCUSDT", "side": "BUY", "margin": "1000", "leverage": 10},
        format="json",
    )

    assert resp.status_code == 200, resp.data
    # Started at the default $10,000, $1,000 margin debited.
    assert _wallet(user).balance == Decimal("9000.00")
    pos = FuturesPosition.objects.get(user=user)
    # contracts = margin * leverage / entry = 1000 * 10 / 100 = 100
    assert pos.amount == Decimal("100")
    assert pos.initial_margin == Decimal("1000")


def test_open_rejects_insufficient_balance(auth_client, user, futures_price):
    futures_price.value = Decimal("100")
    resp = auth_client.post(
        OPEN_URL,
        {"symbol": "BTCUSDT", "side": "BUY", "margin": "999999", "leverage": 10},
        format="json",
    )
    assert resp.status_code == 400
    assert _wallet(user).balance == Decimal("10000.00")
    assert FuturesPosition.objects.count() == 0


# ---------------------------------------------------------------------------
# CLOSE: settles PnL at the SERVER price and credits the wallet.
# ---------------------------------------------------------------------------
def test_close_settles_profit_at_server_price(auth_client, user, futures_price):
    futures_price.value = Decimal("100")
    open_resp = auth_client.post(
        OPEN_URL,
        {"symbol": "BTCUSDT", "side": "BUY", "margin": "1000", "leverage": 10},
        format="json",
    )
    assert open_resp.status_code == 200, open_resp.data
    pos_id = open_resp.data["position"]["id"]
    assert _wallet(user).balance == Decimal("9000.00")

    # Price moves up 10% -> long profits. PnL = 100 contracts * (110-100) = +1000.
    futures_price.value = Decimal("110")
    close_resp = auth_client.post(_close_url(pos_id), {"price": "0.01"}, format="json")

    assert close_resp.status_code == 200, close_resp.data
    assert Decimal(close_resp.data["pnl"]) == Decimal("1000")
    # Credited = margin (1000) + pnl (1000) = 2000. 9000 + 2000 = 11000.
    assert _wallet(user).balance == Decimal("11000.00")

    pos = FuturesPosition.objects.get(id=pos_id)
    assert pos.status == "CLOSED"
    assert pos.pnl == Decimal("1000")
    assert pos.closed_at is not None


def test_close_settles_loss_at_server_price(auth_client, user, futures_price):
    futures_price.value = Decimal("100")
    open_resp = auth_client.post(
        OPEN_URL,
        {"symbol": "BTCUSDT", "side": "BUY", "margin": "1000", "leverage": 10},
        format="json",
    )
    pos_id = open_resp.data["position"]["id"]

    # Price down 5% -> PnL = 100 * (95-100) = -500. Credited = 1000-500 = 500.
    futures_price.value = Decimal("95")
    close_resp = auth_client.post(_close_url(pos_id), format="json")

    assert close_resp.status_code == 200, close_resp.data
    # 9000 + 500 = 9500.
    assert _wallet(user).balance == Decimal("9500.00")


# ---------------------------------------------------------------------------
# SETTLEMENT CLAMP: a blown-up position floors the credit at 0 — never < 0.
# ---------------------------------------------------------------------------
def test_close_deeply_losing_position_floors_wallet_credit(auth_client, user, futures_price):
    futures_price.value = Decimal("100")
    open_resp = auth_client.post(
        OPEN_URL,
        {"symbol": "BTCUSDT", "side": "BUY", "margin": "1000", "leverage": 10},
        format="json",
    )
    pos_id = open_resp.data["position"]["id"]
    assert _wallet(user).balance == Decimal("9000.00")

    # Catastrophic crash to $1: PnL = 100 * (1-100) = -9900.
    # margin + pnl = 1000 - 9900 = -8900  ->  credited clamped to 0.
    futures_price.value = Decimal("1")
    close_resp = auth_client.post(_close_url(pos_id), format="json")

    assert close_resp.status_code == 200, close_resp.data
    # Realized PnL is recorded accurately...
    assert Decimal(close_resp.data["pnl"]) == Decimal("-9900")
    pos = FuturesPosition.objects.get(id=pos_id)
    assert pos.pnl == Decimal("-9900")

    # ...but the wallet credit is floored at 0, so balance stays at 9000
    # (no money added back, and it never goes negative).
    wallet = _wallet(user)
    assert wallet.balance == Decimal("9000.00")
    assert wallet.balance >= Decimal("0")


# ---------------------------------------------------------------------------
# Auth path sanity: prove the JWT login flow yields a usable bearer token.
# ---------------------------------------------------------------------------
def test_open_with_real_jwt_token(api_client, user, futures_price):
    futures_price.value = Decimal("100")

    login = api_client.post(
        "/api/accounts/login/",
        {"username": user.username, "password": "Sup3r-Secret-Pw!"},
        format="json",
    )
    assert login.status_code == 200, login.data
    token = login.data["access"]

    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    resp = api_client.post(
        OPEN_URL,
        {"symbol": "ETHUSDT", "side": "SELL", "margin": "500", "leverage": 5},
        format="json",
    )
    assert resp.status_code == 200, resp.data
    assert FuturesPosition.objects.filter(user=user, side="SHORT").exists()
