from decimal import Decimal


def calculate_contracts(margin, entry_price, leverage):
    position_size = margin * leverage
    return position_size / entry_price


def liquidation_price(entry_price, leverage, side):
    entry = Decimal(entry_price)
    lev = Decimal(leverage)

    side = side.upper()

    if side == "LONG":
        return entry * (1 - (Decimal("1") / lev))
    elif side == "SHORT":
        return entry * (1 + (Decimal("1") / lev))
    else:
        raise ValueError(f"Invalid side: {side}")


def calculate_pnl(entry_price, current_price, side, contracts):
    entry = Decimal(entry_price)
    current = Decimal(current_price)
    side = side.upper()

    if side == "LONG":
        return contracts * (current - entry)
    elif side == "SHORT":
        return contracts * (entry - current)
    else:
        raise ValueError(f"Invalid side: {side}")