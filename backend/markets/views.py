from decimal import Decimal, InvalidOperation
from django.core.cache import cache
from django.db import transaction
from rest_framework.decorators import (
    api_view,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from .models import SpotWallet, SpotAsset
from .prices import get_spot_price, PriceUnavailable
import requests
import os

# ============= COINGECKO CONFIG =============
API_KEY = os.getenv("COINGECKO_API_KEY")
BASE = "https://api.coingecko.com/api/v3"


def cg(endpoint, params=None):
    """ Safe CoinGecko call """
    headers = {"x-cg-demo-api-key": API_KEY}
    url = f"{BASE}{endpoint}"

    try:
        r = requests.get(url, headers=headers, params=params, timeout=5)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print("COINGECKO ERROR:", e)
        return None


# -------- helper --------
def get_or_create_wallet(user):
    wallet, _ = SpotWallet.objects.get_or_create(user=user)
    return wallet


# ===================== MARKETS =====================

# TOP 100
@api_view(["GET"])
@throttle_classes([ScopedRateThrottle])
def top_100(request):
    cached = cache.get("top100_cache")
    if cached:
        return Response(cached)

    data = cg(
        "/coins/markets",
        params={
            "vs_currency": "usd",
            "order": "market_cap_desc",
            "per_page": 100,
            "page": 1,
            "sparkline": "true",
            "price_change_percentage": "24h",
        },
    )

    cache.set("top100_cache", data, timeout=60)
    return Response(data)


# TOP 8 for homepage
@api_view(["GET"])
@throttle_classes([ScopedRateThrottle])
def top8(request):
    cached = cache.get("top8_cache")
    if cached:
        return Response(cached)

    data = cg(
        "/coins/markets",
        params={
            "vs_currency": "usd",
            "ids": (
                "bitcoin,ethereum,solana,ripple,cardano,"
                "binancecoin,polkadot,matic-network"
            ),
            "sparkline": "false",
        },
    )

    cache.set("top8_cache", data, timeout=45)
    return Response(data)


# COIN DETAIL
@api_view(["GET"])
@throttle_classes([ScopedRateThrottle])
def market_detail(request, coin_id):
    cache_key = f"coin_detail_{coin_id}"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    info = cg(
        f"/coins/{coin_id}",
        params={
            "localization": "false",
            "market_data": "true",
            "sparkline": "true",
        },
    )

    chart = cg(
        f"/coins/{coin_id}/market_chart",
        params={"vs_currency": "usd", "days": 7},
    )

    payload = {"info": info, "chart": chart}
    cache.set(cache_key, payload, timeout=60)
    return Response(payload)


# ScopedRateThrottle reads `throttle_scope` off the view. @api_view wraps each
# function in a generated APIView subclass reachable via `.cls`, so we set the
# "market" scope there (rate configured in REST_FRAMEWORK.DEFAULT_THROTTLE_RATES).
top_100.cls.throttle_scope = "market"
top8.cls.throttle_scope = "market"
market_detail.cls.throttle_scope = "market"


# ===================== SPOT WALLET =====================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def spot_wallet(request):
    wallet = get_or_create_wallet(request.user)
    assets = SpotAsset.objects.filter(user=request.user)

    if not assets.exists():
        return Response(
            {
                "balance": str(wallet.balance),
                "total_asset_value": "0",
                "assets": [],
            }
        )

    coin_ids = ",".join(a.coin_id for a in assets)

    market_data = cg(
        "/coins/markets",
        params={"vs_currency": "usd", "ids": coin_ids},
    ) or []

    price_map = {
        c["id"]: Decimal(str(c["current_price"]))
        for c in market_data
        if "id" in c and "current_price" in c
    }

    total_value = Decimal("0")
    asset_list = []

    for a in assets:
        live_price = price_map.get(a.coin_id, Decimal("0"))
        usd_value = a.amount * live_price
        total_value += usd_value

        asset_list.append(
            {
                "coin_id": a.coin_id,
                "symbol": a.symbol,
                "amount": str(a.amount),
                "avg_price": str(a.avg_price),
                "live_price": str(live_price),
                "usd_value": str(usd_value),
            }
        )

    return Response(
        {
            "balance": str(wallet.balance),
            "total_asset_value": str(total_value),
            "assets": asset_list,
        }
    )


# ===================== DEPOSIT =====================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def deposit(request):
    try:
        amt = Decimal(str(request.data.get("amount")))
    except (InvalidOperation, ValueError, TypeError):
        return Response({"error": "Invalid amount"}, status=400)

    if amt <= 0:
        return Response({"error": "Amount must be positive"}, status=400)

    # Atomic + row lock: read-modify-write on a balance must be serialized so
    # concurrent deposits can't clobber each other. (No-op on SQLite, correct
    # on Postgres — the production target.)
    with transaction.atomic():
        wallet = get_or_create_wallet(request.user)
        wallet = SpotWallet.objects.select_for_update().get(pk=wallet.pk)
        wallet.balance += amt
        wallet.save()

    return Response(
        {"message": "Deposit successful", "balance": str(wallet.balance)}
    )


# ===================== WITHDRAW =====================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def withdraw(request):
    try:
        amt = Decimal(str(request.data.get("amount")))
    except (InvalidOperation, ValueError, TypeError):
        return Response({"error": "Invalid amount"}, status=400)

    if amt <= 0:
        return Response({"error": "Amount must be positive"}, status=400)

    # Balance check happens INSIDE the locked transaction so a concurrent
    # withdraw can't pass the check against a stale balance and overdraw.
    with transaction.atomic():
        wallet = get_or_create_wallet(request.user)
        wallet = SpotWallet.objects.select_for_update().get(pk=wallet.pk)

        if amt > wallet.balance:
            return Response({"error": "Insufficient balance"}, status=400)

        wallet.balance -= amt
        wallet.save()

    return Response(
        {"message": "Withdraw successful", "balance": str(wallet.balance)}
    )


# ===================== BUY =====================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def buy(request):
    coin_id = request.data.get("coin_id")
    symbol = request.data.get("symbol")
    amount_usd = request.data.get("amount")
    # NOTE: any client-supplied `price` is ignored (see SECURITY note below).

    if not all([coin_id, symbol, amount_usd]):
        return Response({"error": "Missing fields"}, status=400)

    try:
        amount_usd = Decimal(str(amount_usd))
    except (InvalidOperation, ValueError, TypeError):
        return Response({"error": "Invalid numbers"}, status=400)

    if amount_usd <= 0:
        return Response({"error": "Amount must be positive"}, status=400)

    # SECURITY: settle at the authoritative server-side price, never the client's.
    try:
        price = get_spot_price(coin_id)
    except PriceUnavailable:
        return Response({"error": "Price data unavailable"}, status=503)

    qty = amount_usd / price

    # Atomic: debit cash + credit the asset position together, both rows locked.
    with transaction.atomic():
        wallet = get_or_create_wallet(request.user)
        wallet = SpotWallet.objects.select_for_update().get(pk=wallet.pk)

        if wallet.balance < amount_usd:
            return Response({"error": "Insufficient balance"}, status=400)

        wallet.balance -= amount_usd
        wallet.save()

        asset, _ = SpotAsset.objects.get_or_create(
            user=request.user, coin_id=coin_id, defaults={"symbol": symbol}
        )
        asset = SpotAsset.objects.select_for_update().get(pk=asset.pk)

        total_before = asset.amount * asset.avg_price
        total_after = total_before + amount_usd
        new_qty = asset.amount + qty

        asset.avg_price = total_after / new_qty
        asset.amount = new_qty
        asset.save()

    return Response({"message": "Buy successful"})


# ===================== SELL =====================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def sell(request):
    coin_id = request.data.get("coin_id")
    amount = request.data.get("amount")
    # NOTE: any client-supplied `price` is ignored (see SECURITY note below).

    if not all([coin_id, amount]):
        return Response({"error": "Missing fields"}, status=400)

    try:
        amount = Decimal(str(amount))
    except (InvalidOperation, ValueError, TypeError):
        return Response({"error": "Invalid numbers"}, status=400)

    if amount <= 0:
        return Response({"error": "Amount must be positive"}, status=400)

    # SECURITY: settle at the authoritative server-side price, never the client's.
    try:
        price = get_spot_price(coin_id)
    except PriceUnavailable:
        return Response({"error": "Price data unavailable"}, status=503)

    # Atomic: debit the asset + credit cash together, both rows locked so a
    # concurrent sell can't pass the holdings check against a stale amount.
    with transaction.atomic():
        wallet = get_or_create_wallet(request.user)
        wallet = SpotWallet.objects.select_for_update().get(pk=wallet.pk)

        asset = (
            SpotAsset.objects.select_for_update()
            .filter(user=request.user, coin_id=coin_id)
            .first()
        )
        if not asset:
            return Response({"error": "No such asset"}, status=400)

        if amount > asset.amount:
            return Response({"error": "Not enough coins"}, status=400)

        usd_value = amount * price
        asset.amount -= amount

        if asset.amount <= 0:
            asset.delete()
        else:
            asset.save()

        wallet.balance += usd_value
        wallet.save()

    return Response({"message": "Sell successful", "returned": str(usd_value)})


# ===================== CONVERT PREVIEW =====================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def convert_preview(request):
    from_id = request.query_params.get("from")
    to_id = request.query_params.get("to")
    amount = request.query_params.get("amount")

    if not all([from_id, to_id, amount]):
        return Response({"error": "Missing parameters"}, status=400)

    try:
        amount = Decimal(str(amount))
    except (InvalidOperation, ValueError, TypeError):
        return Response({"error": "Invalid amount"}, status=400)

    # Read-only preview (no money moves), but still price server-side.
    try:
        p_from = get_spot_price(from_id)
        p_to = get_spot_price(to_id)
    except PriceUnavailable:
        return Response({"error": "Price data unavailable"}, status=503)

    usd_value = amount * p_from
    to_amount = usd_value / p_to

    to_asset = SpotAsset.objects.filter(
        user=request.user, coin_id=to_id
    ).first()
    to_symbol = to_asset.symbol if to_asset else to_id

    return Response(
        {
            "from_coin": from_id,
            "to_coin": to_id,
            "from_amount": str(amount),
            "to_amount": str(to_amount),
            "to_symbol": to_symbol,
        }
    )


# ===================== CONVERT =====================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def convert(request):
    from_id = request.data.get("from_coin") or request.data.get("from_id")
    to_id = request.data.get("to_coin") or request.data.get("to_id")
    amount = request.data.get("amount")

    if not all([from_id, to_id, amount]):
        return Response({"error": "Missing fields"}, status=400)

    try:
        amount = Decimal(str(amount))
    except (InvalidOperation, ValueError, TypeError):
        return Response({"error": "Invalid amount"}, status=400)

    if amount <= 0:
        return Response({"error": "Amount must be positive"}, status=400)

    # SECURITY: settle at authoritative server-side prices, never the client's.
    try:
        p_from = get_spot_price(from_id)
        p_to = get_spot_price(to_id)
    except PriceUnavailable:
        return Response({"error": "Price data unavailable"}, status=503)

    usd_value = amount * p_from
    qty_to_receive = usd_value / p_to

    # Atomic: debit the source asset + credit the destination asset together,
    # both rows locked against concurrent converts.
    with transaction.atomic():
        from_asset = (
            SpotAsset.objects.select_for_update()
            .filter(user=request.user, coin_id=from_id)
            .first()
        )
        if not from_asset:
            return Response({"error": "You don't own this coin"}, status=400)

        if amount > from_asset.amount:
            return Response({"error": "Not enough balance to convert"}, status=400)

        # Deduct from old asset
        from_asset.amount -= amount
        if from_asset.amount <= 0:
            from_asset.delete()
        else:
            from_asset.save()

        # Add to new asset. Prefer the client-supplied ticker (same trust model
        # as buy) so the holding shows a real symbol like "ETH" — which also lets
        # the frontend map it to a live Binance pair — falling back to a slug.
        to_symbol = (request.data.get("to_symbol") or to_id[:5]).strip().upper()[:12]
        to_asset, _ = SpotAsset.objects.get_or_create(
            user=request.user,
            coin_id=to_id,
            defaults={"symbol": to_symbol or to_id[:5].upper()},
        )
        to_asset = SpotAsset.objects.select_for_update().get(pk=to_asset.pk)

        total_before = to_asset.amount * to_asset.avg_price
        total_after = total_before + usd_value
        new_qty = to_asset.amount + qty_to_receive

        to_asset.avg_price = total_after / new_qty if new_qty > 0 else p_to
        to_asset.amount = new_qty
        to_asset.save()

    return Response({"message": "Conversion successful"})
