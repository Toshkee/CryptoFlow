from decimal import Decimal
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SpotWallet, SpotAsset
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
        r = requests.get(url, headers=headers, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print("❌ COINGECKO ERROR:", e)
        return None


# -------- helper --------
def get_or_create_wallet(user):
    wallet, _ = SpotWallet.objects.get_or_create(user=user)
    return wallet


# ===================== MARKETS =====================

# TOP 100
@api_view(["GET"])
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
    wallet = get_or_create_wallet(request.user)

    try:
        amt = Decimal(request.data.get("amount"))
    except Exception:
        return Response({"error": "Invalid amount"}, status=400)

    if amt <= 0:
        return Response({"error": "Amount must be positive"}, status=400)

    wallet.balance += amt
    wallet.save()

    return Response(
        {"message": "Deposit successful", "balance": str(wallet.balance)}
    )


# ===================== WITHDRAW =====================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def withdraw(request):
    wallet = get_or_create_wallet(request.user)

    try:
        amt = Decimal(request.data.get("amount"))
    except Exception:
        return Response({"error": "Invalid amount"}, status=400)

    if amt <= 0:
        return Response({"error": "Amount must be positive"}, status=400)

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
    wallet = get_or_create_wallet(request.user)

    coin_id = request.data.get("coin_id")
    symbol = request.data.get("symbol")
    amount_usd = request.data.get("amount")
    price = request.data.get("price")

    if not all([coin_id, symbol, amount_usd, price]):
        return Response({"error": "Missing fields"}, status=400)

    try:
        amount_usd = Decimal(amount_usd)
        price = Decimal(price)
    except Exception:
        return Response({"error": "Invalid numbers"}, status=400)

    if amount_usd <= 0:
        return Response({"error": "Amount must be positive"}, status=400)

    if wallet.balance < amount_usd:
        return Response({"error": "Insufficient balance"}, status=400)

    qty = amount_usd / price
    wallet.balance -= amount_usd
    wallet.save()

    asset, _ = SpotAsset.objects.get_or_create(
        user=request.user, coin_id=coin_id, defaults={"symbol": symbol}
    )

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
    wallet = get_or_create_wallet(request.user)

    coin_id = request.data.get("coin_id")
    amount = request.data.get("amount")
    price = request.data.get("price")

    if not all([coin_id, amount, price]):
        return Response({"error": "Missing fields"}, status=400)

    try:
        amount = Decimal(amount)
        price = Decimal(price)
    except Exception:
        return Response({"error": "Invalid numbers"}, status=400)

    if amount <= 0:
        return Response({"error": "Amount must be positive"}, status=400)

    asset = SpotAsset.objects.filter(user=request.user, coin_id=coin_id).first()
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
        amount = Decimal(amount)
    except Exception:
        return Response({"error": "Invalid amount"}, status=400)

    prices = cg(
        "/simple/price",
        params={"ids": f"{from_id},{to_id}", "vs_currencies": "usd"},
    )

    if not prices or from_id not in prices or to_id not in prices:
        return Response({"error": "Price data unavailable"}, status=400)

    p_from = Decimal(str(prices[from_id]["usd"]))
    p_to = Decimal(str(prices[to_id]["usd"]))

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
    wallet = get_or_create_wallet(request.user)

    from_id = request.data.get("from_coin") or request.data.get("from_id")
    to_id = request.data.get("to_coin") or request.data.get("to_id")
    amount = request.data.get("amount")

    if not all([from_id, to_id, amount]):
        return Response({"error": "Missing fields"}, status=400)

    try:
        amount = Decimal(amount)
    except Exception:
        return Response({"error": "Invalid amount"}, status=400)

    if amount <= 0:
        return Response({"error": "Amount must be positive"}, status=400)

    from_asset = SpotAsset.objects.filter(
        user=request.user, coin_id=from_id
    ).first()
    if not from_asset:
        return Response({"error": "You don't own this coin"}, status=400)

    if amount > from_asset.amount:
        return Response({"error": "Not enough balance to convert"}, status=400)

    prices = cg(
        "/simple/price",
        params={"ids": f"{from_id},{to_id}", "vs_currencies": "usd"},
    )

    if not prices or from_id not in prices or to_id not in prices:
        return Response({"error": "Price data unavailable"}, status=400)

    p_from = Decimal(str(prices[from_id]["usd"]))
    p_to = Decimal(str(prices[to_id]["usd"]))

    usd_value = amount * p_from
    qty_to_receive = usd_value / p_to

    # Deduct from old asset
    from_asset.amount -= amount
    if from_asset.amount <= 0:
        from_asset.delete()
    else:
        from_asset.save()

    # Add to new asset
    to_asset, _ = SpotAsset.objects.get_or_create(
        user=request.user,
        coin_id=to_id,
        defaults={"symbol": to_id[:5].upper()},
    )

    total_before = to_asset.amount * to_asset.avg_price
    total_after = total_before + usd_value
    new_qty = to_asset.amount + qty_to_receive

    to_asset.avg_price = total_after / new_qty if new_qty > 0 else p_to
    to_asset.amount = new_qty
    to_asset.save()

    return Response({"message": "Conversion successful"})