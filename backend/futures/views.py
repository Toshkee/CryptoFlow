from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from decimal import Decimal, InvalidOperation

from markets.prices import get_futures_price, PriceUnavailable
from markets.models import SpotWallet

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
# TRANSFER FUNDS  (spot wallet  <->  futures / trading wallet)
# ---------------------------------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def transfer_funds(request):
    """Move cash between the user's spot wallet and futures (trading) wallet.

    Body: {"direction": "to_futures" | "to_spot", "amount": <number>}

    Both wallet rows are locked with select_for_update inside ONE atomic
    transaction, so a concurrent transfer or trade can't double-spend the moved
    amount. We always acquire the locks in the same order (futures then spot) so
    two transfers in opposite directions can't deadlock.
    """
    user = request.user

    direction = request.data.get("direction")
    if direction not in ("to_futures", "to_spot"):
        return Response(
            {"error": "direction must be 'to_futures' or 'to_spot'"}, status=400
        )

    try:
        amount = Decimal(str(request.data.get("amount")))
        # Reject NaN/Infinity before they reach quantize() (which would raise
        # InvalidOperation and 500 instead of a clean 400).
        if not amount.is_finite():
            raise InvalidOperation
        # The futures wallet stores 2 decimal places; quantize to cents so a
        # high-precision input can't be rejected by the DB or leave dust behind.
        # Oversized magnitudes (e.g. "1e27") raise InvalidOperation here too.
        amount = amount.quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        return Response({"error": "Invalid amount"}, status=400)

    if amount <= 0:
        return Response({"error": "Amount must be positive"}, status=400)

    with transaction.atomic():
        futures, _ = FuturesWallet.objects.get_or_create(user=user)
        spot, _ = SpotWallet.objects.get_or_create(user=user)
        # Lock both rows (consistent order avoids deadlocks).
        futures = FuturesWallet.objects.select_for_update().get(pk=futures.pk)
        spot = SpotWallet.objects.select_for_update().get(pk=spot.pk)

        if direction == "to_futures":
            if spot.balance < amount:
                return Response({"error": "Insufficient spot balance"}, status=400)
            spot.balance -= amount
            futures.balance += amount
        else:  # to_spot
            if futures.balance < amount:
                return Response(
                    {"error": "Insufficient futures balance"}, status=400
                )
            futures.balance -= amount
            spot.balance += amount

        spot.save()
        futures.save()

    return Response({
        "message": "Transfer successful",
        "direction": direction,
        "amount": str(amount),
        "futures_balance": str(futures.balance),
        "spot_balance": str(spot.balance),
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

    # NOTE: `price` is deliberately NOT required. The entry price is fetched
    # server-side (see SECURITY note below); any client-supplied price is
    # ignored. The frontend may still send one for its own optimistic UI.
    required = ["symbol", "side", "margin", "leverage"]
    for field in required:
        if not request.data.get(field):
            return Response({"error": f"{field} is required"}, status=400)

    symbol = request.data["symbol"]
    side = request.data["side"]
    margin = request.data["margin"]
    leverage = request.data["leverage"]

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
    except (ValueError, TypeError):
        return Response({"error": "Leverage must be an integer"}, status=400)

    # Validate margin
    try:
        margin = Decimal(str(margin))
    except (InvalidOperation, ValueError, TypeError):
        return Response({"error": "Invalid numeric values"}, status=400)

    if margin <= 0:
        return Response({"error": "Margin must be positive"}, status=400)

    symbol = symbol.upper()

    # SECURITY: authoritative entry price comes from Binance, server-side.
    # A client-supplied price would let a user mint PnL out of thin air.
    try:
        entry_price = get_futures_price(symbol)
    except PriceUnavailable:
        return Response({"error": "Live price unavailable, please retry"}, status=503)

    # Compute contract size + liquidation price from the authoritative entry.
    contracts = calculate_contracts(margin, entry_price, leverage)
    liq_price = liquidation_price(entry_price, leverage, backend_side)

    # Atomic: the wallet debit and the position create must both apply or
    # neither. select_for_update locks the wallet row so two concurrent opens
    # can't double-spend the same balance.
    # (select_for_update is a no-op on SQLite but correct on Postgres, the
    # production target.)
    with transaction.atomic():
        wallet, _ = FuturesWallet.objects.get_or_create(user=user)
        wallet = FuturesWallet.objects.select_for_update().get(pk=wallet.pk)

        if wallet.balance < margin:
            return Response({"error": "Insufficient balance"}, status=400)

        wallet.balance -= margin
        wallet.save()

        pos = FuturesPosition.objects.create(
            user=user,
            symbol=symbol,
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
# CLOSE POSITION (settles at the live server-side price)
# ---------------------------------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def close_position(request, position_id):
    user = request.user

    try:
        pos = FuturesPosition.objects.get(id=position_id, user=user, status="OPEN")
    except FuturesPosition.DoesNotExist:
        return Response({"error": "Position not found"}, status=404)

    # SECURITY: ignore any client-sent price; always settle at the live
    # Binance price fetched server-side.
    try:
        current_price = get_futures_price(pos.symbol)
    except PriceUnavailable:
        return Response({"error": "Unable to fetch live price, please retry"}, status=503)

    # Atomic so the position close and the wallet credit can't half-apply, and
    # the re-fetch under select_for_update prevents a double-close race from
    # crediting the margin twice. (No-op locking on SQLite, correct on Postgres.)
    with transaction.atomic():
        try:
            pos = FuturesPosition.objects.select_for_update().get(
                id=position_id, user=user, status="OPEN"
            )
        except FuturesPosition.DoesNotExist:
            return Response({"error": "Position not found"}, status=404)

        wallet, _ = FuturesWallet.objects.get_or_create(user=user)
        wallet = FuturesWallet.objects.select_for_update().get(pk=wallet.pk)

        # Realized PnL is stored accurately...
        pnl = calculate_pnl(pos.entry_price, current_price, pos.side, pos.amount)

        # ...but the wallet credit is floored at 0: a blown-up position can
        # lose at most its margin (it would have been liquidated), so we never
        # drive the wallet balance negative.
        credited = max(Decimal("0"), pos.initial_margin + pnl)

        pos.status = "CLOSED"
        pos.closed_at = timezone.now()
        pos.pnl = pnl
        pos.save()

        wallet.balance += credited
        wallet.save()

    return Response({
        "message": "Position closed successfully",
        "pnl": str(pnl),
        "wallet_balance": str(wallet.balance),
        "closed_price": str(current_price),
    })
