"""
Integration tests for the spot wallet endpoints (deposit / withdraw / buy / sell).

`markets.views.get_spot_price` is monkeypatched to a FIXED value via the
`spot_price` fixture, so no real CoinGecko call happens and we can prove the
server prices every trade — the client's `price` is ignored.
"""

from decimal import Decimal

import pytest

from markets.models import SpotAsset, SpotWallet

pytestmark = pytest.mark.django_db

DEPOSIT_URL = "/api/markets/wallet/deposit/"
WITHDRAW_URL = "/api/markets/wallet/withdraw/"
BUY_URL = "/api/markets/wallet/buy/"
SELL_URL = "/api/markets/wallet/sell/"


def _wallet(user):
    return SpotWallet.objects.get(user=user)


# ---------------------------------------------------------------------------
# Deposit / withdraw move the cash balance correctly.
# ---------------------------------------------------------------------------
def test_deposit_increases_balance(auth_client, user):
    resp = auth_client.post(DEPOSIT_URL, {"amount": "1000"}, format="json")
    assert resp.status_code == 200, resp.data
    assert _wallet(user).balance == Decimal("1000")


def test_withdraw_decreases_balance(auth_client, user):
    auth_client.post(DEPOSIT_URL, {"amount": "1000"}, format="json")
    resp = auth_client.post(WITHDRAW_URL, {"amount": "400"}, format="json")
    assert resp.status_code == 200, resp.data
    assert _wallet(user).balance == Decimal("600")


def test_withdraw_over_balance_is_rejected(auth_client, user):
    auth_client.post(DEPOSIT_URL, {"amount": "600"}, format="json")
    resp = auth_client.post(WITHDRAW_URL, {"amount": "700"}, format="json")
    assert resp.status_code == 400
    # Balance untouched.
    assert _wallet(user).balance == Decimal("600")


# ---------------------------------------------------------------------------
# ANTI-EXPLOIT: a $500 buy at a faked client price=1 does NOT yield 500 coins.
# ---------------------------------------------------------------------------
def test_buy_uses_server_price_not_client_price(auth_client, user, spot_price):
    spot_price.value = Decimal("100")  # authoritative server price
    auth_client.post(DEPOSIT_URL, {"amount": "500"}, format="json")

    resp = auth_client.post(
        BUY_URL,
        {
            "coin_id": "bitcoin",
            "symbol": "btc",
            "amount": "500",
            "price": "1",  # <-- faked client price; MUST be ignored
        },
        format="json",
    )
    assert resp.status_code == 200, resp.data

    asset = SpotAsset.objects.get(user=user, coin_id="bitcoin")
    # $500 / $100 server price = 5 coins, NOT the 500 a price=1 exploit implies.
    assert asset.amount == Decimal("5")
    assert asset.amount != Decimal("500")
    # Cash fully spent.
    assert _wallet(user).balance == Decimal("0")
    # Cost basis recorded at the server price.
    assert asset.avg_price == Decimal("100")


def test_buy_rejected_when_insufficient_cash(auth_client, user, spot_price):
    spot_price.value = Decimal("100")
    # Only $100 deposited, try to buy $500 worth.
    auth_client.post(DEPOSIT_URL, {"amount": "100"}, format="json")
    resp = auth_client.post(
        BUY_URL,
        {"coin_id": "bitcoin", "symbol": "btc", "amount": "500"},
        format="json",
    )
    assert resp.status_code == 400
    assert _wallet(user).balance == Decimal("100")
    assert not SpotAsset.objects.filter(user=user).exists()


# ---------------------------------------------------------------------------
# Sell credits the wallet at the server price and reduces holdings.
# ---------------------------------------------------------------------------
def test_sell_credits_wallet_at_server_price(auth_client, user, spot_price):
    spot_price.value = Decimal("100")
    auth_client.post(DEPOSIT_URL, {"amount": "500"}, format="json")
    auth_client.post(
        BUY_URL,
        {"coin_id": "bitcoin", "symbol": "btc", "amount": "500"},
        format="json",
    )
    # Now holds 5 coins, $0 cash.
    assert _wallet(user).balance == Decimal("0")

    # Price doubles; sell all 5 coins -> 5 * $200 = $1,000 back.
    spot_price.value = Decimal("200")
    resp = auth_client.post(
        SELL_URL,
        {"coin_id": "bitcoin", "amount": "5"},
        format="json",
    )
    assert resp.status_code == 200, resp.data
    assert _wallet(user).balance == Decimal("1000")
    # Position fully sold -> asset row removed.
    assert not SpotAsset.objects.filter(user=user, coin_id="bitcoin").exists()


def test_sell_more_than_held_is_rejected(auth_client, user, spot_price):
    spot_price.value = Decimal("100")
    auth_client.post(DEPOSIT_URL, {"amount": "500"}, format="json")
    auth_client.post(
        BUY_URL,
        {"coin_id": "bitcoin", "symbol": "btc", "amount": "500"},
        format="json",
    )
    resp = auth_client.post(
        SELL_URL,
        {"coin_id": "bitcoin", "amount": "9999"},
        format="json",
    )
    assert resp.status_code == 400
    assert SpotAsset.objects.get(user=user, coin_id="bitcoin").amount == Decimal("5")
