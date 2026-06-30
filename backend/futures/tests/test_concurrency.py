"""
Double-spend / lost-update regression for the futures wallet.

`open_position` / `close_position` wrap the wallet mutation in
`transaction.atomic()` + `select_for_update()`, so two concurrent closes of the
same position must credit the wallet exactly once (no double credit) and two
concurrent opens must not both pass the same balance check.

NOTE ON SQLITE: `select_for_update()` is a NO-OP on SQLite and SQLite's
threading/locking model can't faithfully reproduce the race, so the strict
THREADED assertion is skipped there (guarded with `pytest.mark.skipif`). CI runs
this exact file against Postgres, where the lock is real. A deterministic,
non-threaded version runs everywhere (including SQLite) so the settlement logic
is always covered.
"""

import threading
from decimal import Decimal
from unittest import mock

import pytest
from django.contrib.auth.models import User
from django.db import connection, connections
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from futures.models import FuturesWallet

OPEN_URL = "/api/futures/open/"
FIXED_PRICE = Decimal("100")


def _close_url(position_id):
    return f"/api/futures/close/{position_id}/"


class FuturesConcurrencyTests(TransactionTestCase):
    # TransactionTestCase commits between threads (no outer test transaction),
    # which is required for the row-lock race to be observable.
    reset_sequences = True

    def setUp(self):
        from django.core.cache import cache

        cache.clear()

        # Creating the user fires the wallet-provisioning signal -> $10,000.
        self.user = User.objects.create_user(
            username="racer", email="racer@example.com", password="Sup3r-Secret-Pw!"
        )

        # Pin the authoritative price so no network call happens and PnL == 0
        # when we close at the same price we opened at.
        patcher = mock.patch("futures.views.get_futures_price", return_value=FIXED_PRICE)
        patcher.start()
        self.addCleanup(patcher.stop)

    # -- helpers ----------------------------------------------------------
    def _client(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        return client

    def _open(self, margin="1000"):
        resp = self._client().post(
            OPEN_URL,
            {"symbol": "BTCUSDT", "side": "BUY", "margin": margin, "leverage": 10},
            format="json",
        )
        assert resp.status_code == 200, resp.data
        return resp.data["position"]["id"]

    def _balance(self):
        return FuturesWallet.objects.get(user=self.user).balance

    # -- deterministic (runs everywhere, incl. SQLite) --------------------
    def test_sequential_double_close_credits_wallet_once(self):
        """Closing the same position twice must credit it once, never twice."""
        pos_id = self._open(margin="1000")
        self.assertEqual(self._balance(), Decimal("9000.00"))

        first = self._client().post(_close_url(pos_id), format="json")
        self.assertEqual(first.status_code, 200, first.data)
        # PnL == 0 (same price) -> credited == margin -> back to $10,000.
        self.assertEqual(self._balance(), Decimal("10000.00"))

        # Second close finds nothing OPEN -> 404, and crucially does NOT
        # credit the margin a second time.
        second = self._client().post(_close_url(pos_id), format="json")
        self.assertEqual(second.status_code, 404)
        self.assertEqual(self._balance(), Decimal("10000.00"))

    # -- strict threaded race (Postgres only) -----------------------------
    @pytest.mark.skipif(
        connection.vendor == "sqlite",
        reason="select_for_update is a no-op on SQLite; CI runs this on Postgres.",
    )
    def test_concurrent_close_does_not_double_credit(self):
        """Two simultaneous closes of one position: exactly one credit."""
        pos_id = self._open(margin="1000")
        self.assertEqual(self._balance(), Decimal("9000.00"))

        barrier = threading.Barrier(2)
        statuses = []
        lock = threading.Lock()

        def worker():
            try:
                barrier.wait(timeout=10)
                resp = self._client().post(_close_url(pos_id), format="json")
                with lock:
                    statuses.append(resp.status_code)
            finally:
                # Release this thread's DB connection.
                connections.close_all()

        threads = [threading.Thread(target=worker) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=20)

        # Exactly one close succeeded; the other saw the position already gone.
        self.assertEqual(sorted(statuses), [200, 404], statuses)
        # Margin credited exactly once -> $10,000, never the $11,000 a lost
        # update (double credit) would produce.
        self.assertEqual(self._balance(), Decimal("10000.00"))

    @pytest.mark.skipif(
        connection.vendor == "sqlite",
        reason="select_for_update is a no-op on SQLite; CI runs this on Postgres.",
    )
    def test_concurrent_open_cannot_double_spend_balance(self):
        """Two simultaneous opens that each need >half the balance: one wins."""
        # Balance is $10,000; each open needs $6,000 margin, so only ONE can
        # succeed without driving the balance negative.
        barrier = threading.Barrier(2)
        statuses = []
        lock = threading.Lock()

        def worker():
            try:
                barrier.wait(timeout=10)
                resp = self._client().post(
                    OPEN_URL,
                    {"symbol": "BTCUSDT", "side": "BUY", "margin": "6000", "leverage": 10},
                    format="json",
                )
                with lock:
                    statuses.append(resp.status_code)
            finally:
                connections.close_all()

        threads = [threading.Thread(target=worker) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join(timeout=20)

        # One open succeeded (200), one was rejected for insufficient balance (400).
        self.assertEqual(sorted(statuses), [200, 400], statuses)
        # Exactly $6,000 debited once -> $4,000 left (not -$2,000).
        self.assertEqual(self._balance(), Decimal("4000.00"))
