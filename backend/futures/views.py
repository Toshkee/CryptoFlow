from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from decimal import Decimal, InvalidOperation

from .models import FuturesWallet, FuturesPosition
from .utils import calculate_contracts, liquidation_price


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def open_position(request):
    user = request.user

    # ---------- VALIDATE INPUT ----------
    symbol = request.data.get("symbol")
    side = request.data.get("side")  # "long" / "short"
    margin = request.data.get("margin")
    leverage = request.data.get("leverage")
    entry_price = request.data.get("price")

    required = ["symbol", "side", "margin", "leverage", "price"]
    for field in required:
        if request.data.get(field) in [None, ""]:
            return Response({"error": f"{field} is required"}, status=400)

    # side validation
    if side not in ["long", "short"]:
        return Response({"error": "Side must be 'long' or 'short'"}, status=400)

    # leverage validation
    try:
        leverage = int(leverage)
        if leverage < 1 or leverage > 125:
            return Response({"error": "Invalid leverage (1–125 allowed)"}, status=400)
    except:
        return Response({"error": "Leverage must be an integer"}, status=400)

    # DECIMAL VALIDATION
    try:
        margin = Decimal(margin)
        entry_price = Decimal(entry_price)
        if margin <= 0 or entry_price <= 0:
            return Response({"error": "Margin and price must be positive"}, status=400)
    except InvalidOperation:
        return Response({"error": "Invalid numeric values"}, status=400)

    # ---------- WALLET ----------
    try:
        wallet = FuturesWallet.objects.get(user=user)
    except FuturesWallet.DoesNotExist:
        return Response({"error": "Futures wallet not found"}, status=404)

    if margin > wallet.balance:
        return Response({"error": "Not enough balance"}, status=400)

    # Deduct margin
    wallet.balance -= margin
    wallet.save()

    # ---------- POSITION CALCULATIONS ----------
    try:
        contracts = calculate_contracts(margin, entry_price, leverage)
        liq = liquidation_price(entry_price, leverage, side)
    except Exception as e:
        # Rollback wallet if calc fails
        wallet.balance += margin
        wallet.save()
        return Response({"error": f"Calc error: {str(e)}"}, status=500)

    # ---------- SAVE POSITION ----------
    pos = FuturesPosition.objects.create(
        user=user,
        symbol=symbol.upper(),      # standardize
        side=side,
        entry_price=entry_price,
        amount=contracts,
        leverage=leverage,
        initial_margin=margin,
        liquidation_price=liq,
    )

    # ---------- RESPONSE ----------
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