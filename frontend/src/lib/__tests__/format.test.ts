import { describe, expect, it } from 'vitest'

import { formatPercent, formatPrice, formatUsd, priceDecimals } from '@/lib/format'

// The real Unicode minus sign (U+2212) — NOT the ASCII hyphen '-'.
const MINUS = '−'

describe('priceDecimals', () => {
  it('uses 2 decimals for values >= 1', () => {
    expect(priceDecimals(1234.5)).toBe(2)
    expect(priceDecimals(1)).toBe(2)
  })

  it('scales decimals up as magnitude shrinks', () => {
    expect(priceDecimals(0.5)).toBe(4)
    expect(priceDecimals(0.0012345)).toBe(5)
    expect(priceDecimals(0.00001234)).toBe(8)
  })
})

describe('formatPrice', () => {
  it('formats large values with thousands separators and 2 decimals', () => {
    expect(formatPrice(1234.5)).toBe('1,234.50')
  })

  it('keeps precision for sub-penny coins', () => {
    expect(formatPrice(0.0012345)).toBe('0.00123') // 5 decimals
    expect(formatPrice(0.00001234)).toBe('0.00001234') // 8 decimals
  })

  it('honors an explicit decimals override', () => {
    expect(formatPrice(1.23456, { decimals: 3 })).toBe('1.235')
  })

  it('renders a dash for nullish / NaN input', () => {
    expect(formatPrice(null)).toBe('—')
    expect(formatPrice(undefined)).toBe('—')
    expect(formatPrice(Number.NaN)).toBe('—')
  })
})

describe('formatPercent', () => {
  it('prefixes positives with a plus sign', () => {
    expect(formatPercent(2.5)).toBe('+2.50%')
  })

  it('renders negatives with the real U+2212 minus, never an ASCII hyphen', () => {
    const out = formatPercent(-3.1)
    expect(out).toBe(`${MINUS}3.10%`)
    expect(out).not.toContain('-') // ASCII hyphen must be absent
    expect(out).toContain(MINUS)
  })

  it('treats zero as unsigned', () => {
    expect(formatPercent(0)).toBe('0.00%')
  })

  it('accepts a custom precision', () => {
    expect(formatPercent(1.2345, 1)).toBe('+1.2%')
  })
})

describe('formatUsd', () => {
  it('formats whole-dollar amounts as currency', () => {
    expect(formatUsd(1000)).toBe('$1,000.00')
  })

  it('uses the U+2212 minus for negative amounts', () => {
    const out = formatUsd(-50.5)
    expect(out).toBe(`${MINUS}$50.50`)
    expect(out).not.toContain('-')
  })

  it('keeps extra precision for sub-dollar amounts', () => {
    expect(formatUsd(0.5)).toBe('$0.5000') // priceDecimals(0.5) === 4
  })

  it('renders a dash for nullish input', () => {
    expect(formatUsd(null)).toBe('—')
  })
})
