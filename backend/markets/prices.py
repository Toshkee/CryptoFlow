"""
Server-side authoritative price service.

SECURITY: trading endpoints must NEVER settle against a client-supplied price.
Trusting `request.data["price"]` is an infinite-money exploit — a user can claim
to "buy" at a low price and "sell" at a high one to mint balance out of thin air.
Every settlement price is fetched HERE, server-side, and cached briefly so we
don't hammer the upstream APIs on bursts of trades.

  * Futures -> Binance USDⓈ-M  (fapi.binance.com)   ~3s cache
  * Spot    -> CoinGecko         (api.coingecko.com) ~10s cache
"""

from decimal import Decimal, InvalidOperation

import requests
from django.core.cache import cache

# These calls happen inside the request/response cycle, so a slow upstream must
# fail fast rather than tie up a worker. 5s is plenty for a single ticker call.
REQUEST_TIMEOUT = 5

BINANCE_FUTURES_TICKER = "https://fapi.binance.com/fapi/v1/ticker/price"

FUTURES_PRICE_CACHE_SECONDS = 3
SPOT_PRICE_CACHE_SECONDS = 10


class PriceUnavailable(Exception):
    """Raised when an authoritative price cannot be determined.

    Callers should translate this into an HTTP 502/503 so the client knows the
    trade was NOT executed (rather than silently settling at a bad price).
    """


def get_futures_price(symbol):
    """Return the live Binance USDⓈ-M futures price for `symbol` as a Decimal.

    Cached ~3s to smooth out bursts of trades on the same symbol. Raises
    PriceUnavailable on any upstream/parse failure.
    """
    symbol = (symbol or "").upper().strip()
    if not symbol:
        raise PriceUnavailable("Missing futures symbol")

    cache_key = f"futures_price:{symbol}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        resp = requests.get(
            BINANCE_FUTURES_TICKER,
            params={"symbol": symbol},
            timeout=REQUEST_TIMEOUT,
        )
        resp.raise_for_status()
        price = Decimal(str(resp.json()["price"]))
    except (requests.RequestException, KeyError, ValueError, TypeError,
            InvalidOperation) as exc:
        raise PriceUnavailable(
            f"Could not fetch futures price for {symbol}"
        ) from exc

    if price <= 0:
        raise PriceUnavailable(f"Invalid futures price for {symbol}")

    cache.set(cache_key, price, timeout=FUTURES_PRICE_CACHE_SECONDS)
    return price


def get_spot_price(coin_id):
    """Return the live USD spot price for a CoinGecko `coin_id` as a Decimal.

    Cached ~10s. Raises PriceUnavailable on any upstream/parse failure.
    """
    coin_id = (coin_id or "").strip()
    if not coin_id:
        raise PriceUnavailable("Missing coin id")

    cache_key = f"spot_price:{coin_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    # Lazy import to reuse the existing CoinGecko helper / API-key pattern
    # without a circular import (markets.views imports this module).
    from .views import cg

    data = cg("/simple/price", params={"ids": coin_id, "vs_currencies": "usd"})
    try:
        price = Decimal(str(data[coin_id]["usd"]))
    except (KeyError, TypeError, ValueError, InvalidOperation) as exc:
        raise PriceUnavailable(
            f"Could not fetch spot price for {coin_id}"
        ) from exc

    if price <= 0:
        raise PriceUnavailable(f"Invalid spot price for {coin_id}")

    cache.set(cache_key, price, timeout=SPOT_PRICE_CACHE_SECONDS)
    return price
