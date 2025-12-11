# users/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User

from markets.models import SpotWallet
from futures.models import FuturesWallet  # FIXED import!


@receiver(post_save, sender=User)
def create_user_wallets(sender, instance, created, **kwargs):
    if created:
        # Create SPOT wallet (starts with $0)
        SpotWallet.objects.get_or_create(user=instance)

        # Create FUTURES wallet (starts with $10,000)
        FuturesWallet.objects.get_or_create(user=instance)