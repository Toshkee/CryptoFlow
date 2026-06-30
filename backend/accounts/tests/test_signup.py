"""
Signup regression tests.

History: THREE separate post_save(User) handlers each tried to create a futures
wallet, which (depending on signal order) produced duplicate wallets or a $0
starting balance instead of $10,000. Provisioning is now centralized + idempotent
(see futures/signals.py). These tests pin that contract: exactly one User, one
Profile, one FuturesWallet at $10,000.
"""

from decimal import Decimal

import pytest
from django.contrib.auth.models import User

from accounts.models import Profile
from futures.models import FuturesWallet
from markets.models import SpotWallet

pytestmark = pytest.mark.django_db

SIGNUP_URL = "/api/accounts/signup/"


def test_signup_creates_exactly_one_user_profile_and_funded_wallet(api_client):
    resp = api_client.post(
        SIGNUP_URL,
        {
            "username": "alice",
            "email": "alice@example.com",
            "password": "Sup3r-Secret-Pw!",
        },
        format="json",
    )
    assert resp.status_code == 201, resp.data

    # Exactly one of each — no duplicate-signal artifacts.
    assert User.objects.filter(username="alice").count() == 1
    user = User.objects.get(username="alice")
    assert Profile.objects.filter(user=user).count() == 1
    assert FuturesWallet.objects.filter(user=user).count() == 1

    # Funded at exactly $10,000 (the duplicate-signal bug yielded $0).
    wallet = FuturesWallet.objects.get(user=user)
    assert wallet.balance == Decimal("10000")

    # Spot wallet also provisioned, and at its $0 default.
    assert SpotWallet.objects.filter(user=user).count() == 1
    assert SpotWallet.objects.get(user=user).balance == Decimal("0")


def test_signup_does_not_create_duplicate_futures_wallets(api_client):
    api_client.post(
        SIGNUP_URL,
        {"username": "bob", "email": "bob@example.com", "password": "An0ther-Pw!xyz"},
        format="json",
    )
    user = User.objects.get(username="bob")
    # The OneToOne + idempotent get_or_create must never yield two wallets.
    assert FuturesWallet.objects.filter(user=user).count() == 1


def test_signup_rejects_weak_password(api_client):
    resp = api_client.post(
        SIGNUP_URL,
        {"username": "charlie", "email": "charlie@example.com", "password": "12345"},
        format="json",
    )
    # Too short, all-numeric, and a common password -> validators reject it.
    assert resp.status_code == 400
    assert "password" in resp.data
    assert not User.objects.filter(username="charlie").exists()


def test_signup_rejects_password_too_similar_to_username(api_client):
    resp = api_client.post(
        SIGNUP_URL,
        {"username": "danielson", "email": "danielson@example.com", "password": "danielson1"},
        format="json",
    )
    assert resp.status_code == 400
    assert not User.objects.filter(username="danielson").exists()
