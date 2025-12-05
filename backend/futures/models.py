from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal


class FuturesWallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=20, decimal_places=8, default=0)

    def __str__(self):
        return f"{self.user.username} Futures Wallet"


class FuturesPosition(models.Model):
    LONG = "LONG"
    SHORT = "SHORT"

    SIDE_CHOICES = [
        (LONG, "Long"),
        (SHORT, "Short"),
    ]

    OPEN = "OPEN"
    CLOSED = "CLOSED"

    STATUS_CHOICES = [
        (OPEN, "Open"),
        (CLOSED, "Closed"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    symbol = models.CharField(max_length=20)  # "btc-usdt"
    side = models.CharField(max_length=5, choices=SIDE_CHOICES)

    entry_price = models.DecimalField(max_digits=20, decimal_places=8)
    amount = models.DecimalField(max_digits=20, decimal_places=8)        # contracts
    leverage = models.IntegerField(default=10)

    initial_margin = models.DecimalField(max_digits=20, decimal_places=8)
    liquidation_price = models.DecimalField(max_digits=20, decimal_places=8)

    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    pnl = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=OPEN)

    def __str__(self):
        return f"{self.user.username} {self.symbol} {self.side}"