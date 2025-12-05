from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from decimal import Decimal, InvalidOperation

import requests

from .models import FuturesWallet, FuturesPosition
from .utils import calculate_contracts, liquidation_price, calculate_pnl


# ---------------------------------------------------------
# GET WALLET BALANCE
# ---------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_wallet(request):
    user = request.user
    wallet, _ = FuturesWallet.objects.get_or_create(user=user)

    return Response({
        "balance": str(wallet.balance)
    })


# ---------------------------------------------------------
# GET ALL OPEN POSITIONS
# ---------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_open_positions(request):
    user = request.user

    positions = FuturesPosition.objects.filter(user=user, status="OPEN")

    return Response([
        {
            "id": p.id,
            "symbol": p.symbol,
            "side": p.side,
            "entry_price": str(p.entry_price),
            "amount": str(p.amount),
            "leverage": p.leverage,
            "initial_margin": str(p.initial_margin),
            "liquidation_price": str(p.liquidation_price),
        }
        for p in positions
    ])


# ---------------------------------------------------------
# OPEN NEW POSITION
# ---------------------------------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def open_position(request):
    user = request.user

    required = ["symbol", "side", "margin", "leverage", "price"]
    for field in required:
        if not request.data.get(field):
            return Response({"error": f"{field} is required"}, status=400)

    symbol = request.data["symbol"]
    side = request.data["side"]
    margin = request.data["margin"]
    leverage = request.data["leverage"]
    entry_price = request.data["price"]

    # BUY / SELL → LONG / SHORT
    side_map = {"BUY": "LONG", "SELL": "SHORT"}
    if side not in side_map:
        return Response({"error": "Side must be BUY or SELL"}, status=400)

    backend_side = side_map[side]

    # Validate leverage
    try:
        leverage = int(leverage)
        if not (1 <= leverage <= 125):
            return Response({"error": "Leverage must be between 1 and 125"}, status=400)
    except:
        return Response({"error": "Leverage must be an integer"}, status=400)

    # Validate amounts
    try:
        margin = Decimal(margin)
        entry_price = Decimal(entry_price)
    except:
        return Response({"error": "Invalid numeric values"}, status=400)

    if margin <= 0:
        return Response({"error": "Margin must be positive"}, status=400)

    wallet, _ = FuturesWallet.objects.get_or_create(user=user)

    if wallet.balance < margin:
        return Response({"error": "Insufficient balance"}, status=400)

    # Deduct
    wallet.balance -= margin
    wallet.save()

    # Compute contract size
    contracts = calculate_contracts(margin, entry_price, leverage)
    liq_price = liquidation_price(entry_price, leverage, backend_side)

    # Create DB entry
    pos = FuturesPosition.objects.create(
        user=user,
        symbol=symbol.upper(),
        side=backend_side,
        entry_price=entry_price,
        amount=contracts,
        leverage=leverage,
        initial_margin=margin,
        liquidation_price=liq_price,
    )

    return Response({
        "message": "Position opened successfully",
        "position": {
            "id": pos.id,
            "symbol": pos.symbol,
            "side": pos.side,
            "entry_price": str(pos.entry_price),
            "contracts": str(pos.amount),
            "leverage": pos.leverage,
            "margin_used": str(pos.initial_margin),
            "liquidation_price": str(pos.liquidation_price),
        }
    })


# ---------------------------------------------------------
# CLOSE POSITION (AUTO-FETCHES LIVE PRICE)
# ---------------------------------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def close_position(request, position_id):
    user = request.user

    try:
        pos = FuturesPosition.objects.get(id=position_id, user=user, status="OPEN")
    except FuturesPosition.DoesNotExist:
        return Response({"error": "Position not found"}, status=404)

    # Frontend may send price — optional
    price = request.data.get("price")

    if price:
        try:
            current_price = Decimal(price)
        except:
            return Response({"error": "Invalid price"}, status=400)

    else:
        # AUTO-FETCH LIVE PRICE FROM BINANCE
        try:
            data = requests.get(
                f"https://fapi.binance.com/fapi/v1/ticker/price?symbol={pos.symbol}"
            ).json()

            current_price = Decimal(data["price"])
        except:
            return Response({"error": "Unable to fetch live price"}, status=500)

    # Calculate final realized PnL
    pnl = calculate_pnl(pos.entry_price, current_price, pos.side, pos.amount)

    # Close the position
    pos.status = "CLOSED"
    pos.closed_at = timezone.now()
    pos.pnl = pnl
    pos.save()

    # Return money + PnL to wallet
    wallet = FuturesWallet.objects.get(user=user)
    wallet.balance += pos.initial_margin + pnl
    wallet.save()

    return Response({
        "message": "Position closed successfully",
        "pnl": str(pnl),
        "wallet_balance": str(wallet.balance),
        "closed_price": str(current_price),
    })