# Wallet provisioning is intentionally centralized.
#
# Historically THREE post_save(User) handlers each created a wallet:
#   - futures.signals      -> FuturesWallet.objects.create(balance=0)   (non-idempotent!)
#   - users.signals        -> FuturesWallet.objects.get_or_create(...)  (default $10,000)
#   - accounts.serializers -> FuturesWallet.objects.get_or_create(...)
# Depending on signal order they collided on the unique user_id
# (IntegrityError on signup) and produced a non-deterministic starting
# balance ($0 vs $10,000).
#
# The single source of truth is now `users.signals.create_user_wallets`
# (idempotent get_or_create with the correct default balances), backed up by
# lazy get_or_create in the futures views. This module deliberately registers
# no handler.
