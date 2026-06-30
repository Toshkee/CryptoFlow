"""
Shared pytest fixtures for the CryptoFlow backend test suite.

Runs on SQLite by default (zero setup); CI also runs the same suite against a
Postgres service so the `select_for_update`-based concurrency guarantees are
exercised for real (see futures/tests/test_concurrency.py).

All authoritative price helpers are monkeypatched in the tests that need them
(`futures.views.get_futures_price`, `markets.views.get_spot_price`) so the suite
NEVER makes a real network call to Binance / CoinGecko.
"""

from decimal import Decimal

import factory
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient


# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------
class UserFactory(factory.django.DjangoModelFactory):
    """A real, login-capable user (password is hashed via set_password)."""

    class Meta:
        model = User
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f"trader{n}")
    email = factory.Sequence(lambda n: f"trader{n}@example.com")

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        # Hash + persist a strong password (clears AUTH_PASSWORD_VALIDATORS) so
        # the JWT login path works. Saving here keeps the hashed value in the DB.
        self.set_password(extracted or "Sup3r-Secret-Pw!")
        if create:
            self.save()


# ---------------------------------------------------------------------------
# Hygiene
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def _clear_cache():
    """Reset the locmem cache between tests.

    The cache backs both DRF throttling (so repeated login/signup calls across
    tests don't trip the per-IP rate limit) and the price cache, keeping tests
    independent.
    """
    from django.core.cache import cache

    cache.clear()
    yield
    cache.clear()


# ---------------------------------------------------------------------------
# Common fixtures
# ---------------------------------------------------------------------------
@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def auth_client(db, user):
    """An APIClient authenticated as `user` (DRF force_authenticate)."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# ---------------------------------------------------------------------------
# Price controllers — patch the SERVER price helpers to a fixed, mutable value.
#
# The trading views import these names INTO their own module namespace
# (`from markets.prices import get_futures_price` etc.), so the effective patch
# target is the *view module*, not markets.prices.
# ---------------------------------------------------------------------------
class PriceController:
    """Callable stand-in for a price helper; `.value` is settable mid-test."""

    def __init__(self, value):
        self.value = Decimal(str(value))
        self.calls = 0

    def __call__(self, *args, **kwargs):
        self.calls += 1
        return self.value


@pytest.fixture
def futures_price(monkeypatch):
    ctrl = PriceController("100")
    monkeypatch.setattr("futures.views.get_futures_price", ctrl)
    return ctrl


@pytest.fixture
def spot_price(monkeypatch):
    ctrl = PriceController("100")
    monkeypatch.setattr("markets.views.get_spot_price", ctrl)
    return ctrl
