"""
Seed (or reset) the public demo account.

Recruiters can click "Try the live demo" and land in a fully populated terminal —
a funded futures wallet, a few open leveraged positions, and a spot portfolio —
without signing up. Idempotent: re-running wipes the demo's positions/assets and
re-seeds from live prices (falling back to sane constants if upstream is down).

    python manage.py seed_demo
"""

from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from futures.models import FuturesPosition, FuturesWallet
from futures.utils import calculate_contracts, liquidation_price
from markets.models import SpotAsset, SpotWallet
from markets.prices import PriceUnavailable, get_futures_price, get_spot_price

DEMO_USERNAME = "demo"
DEMO_PASSWORD = "demodemo123"
DEMO_EMAIL = "demo@cryptoflow.app"

FALLBACK_FUTURES = {"BTCUSDT": Decimal("60000"), "ETHUSDT": Decimal("3000"), "SOLUSDT": Decimal("150")}
FALLBACK_SPOT = {"bitcoin": Decimal("60000"), "ethereum": Decimal("3000"), "solana": Decimal("150")}

# (symbol, BUY/SELL, margin, leverage)
DEMO_POSITIONS = [
    ("BTCUSDT", "BUY", Decimal("1000"), 10),
    ("ETHUSDT", "SELL", Decimal("500"), 5),
    ("SOLUSDT", "BUY", Decimal("750"), 20),
]
# (coin_id, symbol, usd to allocate)
DEMO_HOLDINGS = [
    ("bitcoin", "btc", Decimal("2500")),
    ("ethereum", "eth", Decimal("1500")),
    ("solana", "sol", Decimal("1000")),
]


class Command(BaseCommand):
    help = "Seed or reset the public demo account (demo / demodemo123)."

    def handle(self, *args, **options):
        with transaction.atomic():
            user, created = User.objects.get_or_create(
                username=DEMO_USERNAME, defaults={"email": DEMO_EMAIL}
            )
            user.set_password(DEMO_PASSWORD)
            user.save()

            # Wallets (signals create them on first save; ensure + reset here).
            fwallet, _ = FuturesWallet.objects.get_or_create(user=user)
            swallet, _ = SpotWallet.objects.get_or_create(user=user)

            # Clean slate.
            FuturesPosition.objects.filter(user=user).delete()
            SpotAsset.objects.filter(user=user).delete()

            fwallet.balance = Decimal("25000")
            swallet.balance = Decimal("5000")

            # Futures positions priced from live marks.
            for symbol, side, margin, lev in DEMO_POSITIONS:
                entry = self._futures_price(symbol)
                backend_side = "LONG" if side == "BUY" else "SHORT"
                FuturesPosition.objects.create(
                    user=user,
                    symbol=symbol,
                    side=backend_side,
                    entry_price=entry,
                    amount=calculate_contracts(margin, entry, lev),
                    leverage=lev,
                    initial_margin=margin,
                    liquidation_price=liquidation_price(entry, lev, backend_side),
                )
                fwallet.balance -= margin

            # Spot holdings priced from live prices.
            for coin_id, symbol, usd in DEMO_HOLDINGS:
                price = self._spot_price(coin_id)
                SpotAsset.objects.create(
                    user=user,
                    coin_id=coin_id,
                    symbol=symbol,
                    amount=usd / price,
                    avg_price=price,
                )

            fwallet.save()
            swallet.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo account ready → username: {DEMO_USERNAME}  password: {DEMO_PASSWORD}"
            )
        )

    def _futures_price(self, symbol):
        try:
            return get_futures_price(symbol)
        except PriceUnavailable:
            self.stdout.write(self.style.WARNING(f"  using fallback price for {symbol}"))
            return FALLBACK_FUTURES[symbol]

    def _spot_price(self, coin_id):
        try:
            return get_spot_price(coin_id)
        except PriceUnavailable:
            self.stdout.write(self.style.WARNING(f"  using fallback price for {coin_id}"))
            return FALLBACK_SPOT[coin_id]
