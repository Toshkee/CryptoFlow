from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from decimal import Decimal
from .models import Asset, UserAsset


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_wallet(request):
    user = request.user

    entries = UserAsset.objects.filter(user=user)

    data = []
    total_usd = Decimal(0)

    for entry in entries:
        price = get_price(entry.asset.symbol)  # live price
        usd_value = entry.amount * price
        total_usd += usd_value

        data.append({
            "symbol": entry.asset.symbol,
            "name": entry.asset.name,
            "amount": str(entry.amount),
            "usd_value": str(usd_value),
        })

    return Response({
        "total_usd": str(total_usd),
        "assets": data,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def deposit(request):
    user = request.user
    symbol = request.data.get("symbol")
    amount = Decimal(request.data.get("amount", 0))

    if amount <= 0:
        return Response({"error": "Invalid amount"}, status=400)

    asset = Asset.objects.get(symbol=symbol)
    user_asset, _ = UserAsset.objects.get_or_create(user=user, asset=asset)
    user_asset.amount += amount
    user_asset.save()

    return Response({"message": "Deposit successful"})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def withdraw(request):
    user = request.user
    symbol = request.data.get("symbol")
    amount = Decimal(request.data.get("amount", 0))

    asset = Asset.objects.get(symbol=symbol)
    user_asset = UserAsset.objects.get(user=user, asset=asset)

    if amount <= 0 or amount > user_asset.amount:
        return Response({"error": "Invalid withdrawal"}, status=400)

    user_asset.amount -= amount
    user_asset.save()

    return Response({"message": "Withdrawal successful"})