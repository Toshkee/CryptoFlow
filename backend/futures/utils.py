from decimal import Decimal


def calculate_contracts(margin, entry_price, leverage):
    position_size = margin * leverage
    return position_size / entry_price


def liquidation_price(entry_price, leverage, side):
    entry = Decimal(entry_price)

    if side == "LONG":
        return entry * (1 - (Decimal("1") / leverage))
    else:
        return entry * (1 + (Decimal("1") / leverage))


def calculate_pnl(entry_price, current_price, side, contracts):
    entry = Decimal(entry_price)
    current = Decimal(current_price)

    if side == "LONG":
        return contracts * (current - entry)
    else:
        return contracts * (entry - current)