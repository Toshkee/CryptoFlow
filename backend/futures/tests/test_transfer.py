"""
Tests for the spot <-> futures fund transfer endpoint.

A transfer moves cash between two wallets, so the invariant that matters most is
CONSERVATION: the sum of (spot + futures) must be identical before and after, and
neither wallet may go negative.
"""

from decimal import Decimal

import pytest

from futures.models import FuturesWallet
from markets.models import SpotWallet

TRANSFER_URL = "/api/futures/transfer/"


def _wallets(user, futures="0", spot="0"):
    fw, _ = FuturesWallet.objects.get_or_create(user=user)
    fw.balance = Decimal(futures)
    fw.save()
    sw, _ = SpotWallet.objects.get_or_create(user=user)
    sw.balance = Decimal(spot)
    sw.save()
    return fw, sw


def _balances(user):
    return (
        FuturesWallet.objects.get(user=user).balance,
        SpotWallet.objects.get(user=user).balance,
    )


@pytest.mark.django_db
def test_transfer_to_futures_debits_spot_credits_futures(auth_client, user):
    _wallets(user, futures="500", spot="1000")

    resp = auth_client.post(
        TRANSFER_URL, {"direction": "to_futures", "amount": "200"}, format="json"
    )

    assert resp.status_code == 200
    futures, spot = _balances(user)
    assert futures == Decimal("700.00")
    assert spot == Decimal("800.00")


@pytest.mark.django_db
def test_transfer_to_spot_debits_futures_credits_spot(auth_client, user):
    _wallets(user, futures="500", spot="1000")

    resp = auth_client.post(
        TRANSFER_URL, {"direction": "to_spot", "amount": "300"}, format="json"
    )

    assert resp.status_code == 200
    futures, spot = _balances(user)
    assert futures == Decimal("200.00")
    assert spot == Decimal("1300.00")


@pytest.mark.django_db
def test_transfer_conserves_total_balance(auth_client, user):
    _wallets(user, futures="500", spot="1000")
    before = sum(_balances(user))

    auth_client.post(
        TRANSFER_URL, {"direction": "to_futures", "amount": "123.45"}, format="json"
    )

    assert sum(_balances(user)) == before


@pytest.mark.django_db
def test_transfer_to_futures_rejects_insufficient_spot(auth_client, user):
    _wallets(user, futures="500", spot="50")

    resp = auth_client.post(
        TRANSFER_URL, {"direction": "to_futures", "amount": "100"}, format="json"
    )

    assert resp.status_code == 400
    # balances untouched
    assert _balances(user) == (Decimal("500.00"), Decimal("50.00000000"))


@pytest.mark.django_db
def test_transfer_to_spot_rejects_insufficient_futures(auth_client, user):
    _wallets(user, futures="50", spot="1000")

    resp = auth_client.post(
        TRANSFER_URL, {"direction": "to_spot", "amount": "100"}, format="json"
    )

    assert resp.status_code == 400
    assert _balances(user) == (Decimal("50.00"), Decimal("1000.00000000"))


@pytest.mark.django_db
def test_transfer_rejects_bad_direction(auth_client, user):
    _wallets(user, futures="500", spot="1000")
    resp = auth_client.post(
        TRANSFER_URL, {"direction": "sideways", "amount": "10"}, format="json"
    )
    assert resp.status_code == 400


@pytest.mark.django_db
@pytest.mark.parametrize("amount", ["0", "-5", "0.004"])
def test_transfer_rejects_non_positive_amount(auth_client, user, amount):
    # "0.004" quantizes to 0.00 cents -> must be rejected, not silently a no-op.
    _wallets(user, futures="500", spot="1000")
    resp = auth_client.post(
        TRANSFER_URL, {"direction": "to_futures", "amount": amount}, format="json"
    )
    assert resp.status_code == 400
    assert _balances(user) == (Decimal("500.00"), Decimal("1000.00000000"))


@pytest.mark.django_db
@pytest.mark.parametrize("amount", ["NaN", "Infinity", "-Infinity", "sNaN", "1e27"])
def test_transfer_rejects_non_finite_or_oversized_amount(auth_client, user, amount):
    # These parse as Decimal but would blow up quantize()/comparison; the endpoint
    # must turn them into a clean 400, not an unhandled 500.
    _wallets(user, futures="500", spot="1000")
    resp = auth_client.post(
        TRANSFER_URL, {"direction": "to_futures", "amount": amount}, format="json"
    )
    assert resp.status_code == 400
    assert _balances(user) == (Decimal("500.00"), Decimal("1000.00000000"))


@pytest.mark.django_db
def test_transfer_requires_authentication(api_client):
    resp = api_client.post(
        TRANSFER_URL, {"direction": "to_futures", "amount": "10"}, format="json"
    )
    assert resp.status_code in (401, 403)
