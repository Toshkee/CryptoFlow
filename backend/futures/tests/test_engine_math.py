"""
Pure-function unit tests for the futures engine math.

No DB, no network — just exact Decimal arithmetic. These pin the financial
formulas the trading endpoints depend on.
"""

from decimal import Decimal

import pytest

from futures.utils import calculate_contracts, calculate_pnl, liquidation_price


# ---------------------------------------------------------------------------
# calculate_contracts:  (margin * leverage) / entry_price
# ---------------------------------------------------------------------------
def test_calculate_contracts_basic():
    # $1,000 margin at 10x against a $100 mark -> $10,000 notional / $100 = 100.
    contracts = calculate_contracts(Decimal("1000"), Decimal("100"), 10)
    assert contracts == Decimal("100")


def test_calculate_contracts_fractional_entry():
    # $500 margin at 5x against a $0.25 mark -> $2,500 / $0.25 = 10,000.
    contracts = calculate_contracts(Decimal("500"), Decimal("0.25"), 5)
    assert contracts == Decimal("10000")


def test_calculate_contracts_scales_linearly_with_leverage():
    one_x = calculate_contracts(Decimal("1000"), Decimal("100"), 1)
    ten_x = calculate_contracts(Decimal("1000"), Decimal("100"), 10)
    assert ten_x == one_x * 10


# ---------------------------------------------------------------------------
# liquidation_price:  LONG  -> entry * (1 - 1/lev)
#                     SHORT -> entry * (1 + 1/lev)
# ---------------------------------------------------------------------------
def test_liquidation_price_long():
    # 10x long at $100 liquidates 10% below -> $90.
    assert liquidation_price(Decimal("100"), 10, "LONG") == Decimal("90")


def test_liquidation_price_short():
    # 10x short at $100 liquidates 10% above -> $110.
    assert liquidation_price(Decimal("100"), 10, "SHORT") == Decimal("110")


def test_liquidation_price_low_leverage_long():
    # 4x long at $200 liquidates 25% below -> $150.
    assert liquidation_price(Decimal("200"), 4, "LONG") == Decimal("150")


def test_liquidation_price_is_case_insensitive():
    assert liquidation_price(Decimal("100"), 5, "long") == liquidation_price(
        Decimal("100"), 5, "LONG"
    )


def test_liquidation_price_invalid_side():
    with pytest.raises(ValueError):
        liquidation_price(Decimal("100"), 10, "SIDEWAYS")


# ---------------------------------------------------------------------------
# calculate_pnl:  LONG  -> contracts * (current - entry)
#                 SHORT -> contracts * (entry - current)
# ---------------------------------------------------------------------------
def test_pnl_long_profit():
    # 100 contracts, entry 100, price up to 110 -> +1,000.
    assert calculate_pnl(Decimal("100"), Decimal("110"), "LONG", Decimal("100")) == Decimal("1000")


def test_pnl_long_loss():
    # 100 contracts, entry 100, price down to 90 -> -1,000.
    assert calculate_pnl(Decimal("100"), Decimal("90"), "LONG", Decimal("100")) == Decimal("-1000")


def test_pnl_short_profit():
    # Short profits when price falls: entry 100 -> 90 -> +1,000.
    assert calculate_pnl(Decimal("100"), Decimal("90"), "SHORT", Decimal("100")) == Decimal("1000")


def test_pnl_short_loss():
    # Short loses when price rises: entry 100 -> 110 -> -1,000.
    assert calculate_pnl(Decimal("100"), Decimal("110"), "SHORT", Decimal("100")) == Decimal("-1000")


def test_pnl_long_and_short_are_mirror_images():
    entry, current, contracts = Decimal("100"), Decimal("137.5"), Decimal("42")
    long_pnl = calculate_pnl(entry, current, "LONG", contracts)
    short_pnl = calculate_pnl(entry, current, "SHORT", contracts)
    assert long_pnl == -short_pnl


def test_pnl_invalid_side():
    with pytest.raises(ValueError):
        calculate_pnl(Decimal("100"), Decimal("110"), "NEUTRAL", Decimal("1"))
