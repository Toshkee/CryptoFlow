# markets/models.py

from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal


# -----------------------------------------
# SPOT WALLET
# -----------------------------------------
class SpotWallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    balance = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        default=Decimal("0")
    )

    def __str__(self):
        return f"{self.user.username} Spot Wallet (${self.balance})"


# -----------------------------------------
# SPOT ASSET
# -----------------------------------------
class SpotAsset(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    coin_id = models.CharField(max_length=50)
    symbol = models.CharField(max_length=20)

    amount = models.DecimalField(
        max_digits=30,
        decimal_places=10,
        default=Decimal("0")
    )

    avg_price = models.DecimalField(
        max_digits=20,
        decimal_places=8,
        default=Decimal("0")
    )

    class Meta:
        unique_together = ("user", "coin_id")

    def __str__(self):
        return f"{self.user.username} {self.symbol} {self.amount}"