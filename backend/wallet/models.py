from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal

class Asset(models.Model):
    symbol = models.CharField(max_length=10, unique=True)  
    name = models.CharField(max_length=50)                 
    icon = models.CharField(max_length=200, blank=True)    

    def __str__(self):
        return f"{self.symbol} – {self.name}"


class UserAsset(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=20, decimal_places=8, default=0)

    def __str__(self):
        return f"{self.user.username} – {self.asset.symbol}: {self.amount}"