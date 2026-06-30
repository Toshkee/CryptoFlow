/**
 * Number / money / percent formatting.
 * Everything routes through Intl.NumberFormat and uses the real Unicode
 * minus sign (U+2212) so negatives align under positives in tabular columns.
 */

const MINUS = '−' // − , not the ASCII hyphen

function fixMinus(s: string): string {
  return s.replace(/-/g, MINUS)
}

/** Decimals scaled to price magnitude (sub-penny coins keep precision). */
export function priceDecimals(value: number): number {
  const v = Math.abs(value)
  if (v === 0) return 2
  if (v >= 1000) return 2
  if (v >= 1) return 2
  if (v >= 0.1) return 4
  if (v >= 0.001) return 5
  return 8
}

export function formatPrice(value: number | string | null | undefined, opts?: { decimals?: number }): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (n == null || Number.isNaN(n)) return '—'
  const decimals = opts?.decimals ?? priceDecimals(n)
  return fixMinus(
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n),
  )
}

export function formatUsd(value: number | string | null | undefined, opts?: { decimals?: number }): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (n == null || Number.isNaN(n)) return '—'
  const decimals = opts?.decimals ?? (Math.abs(n) >= 1 || n === 0 ? 2 : priceDecimals(n))
  return fixMinus(
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n),
  )
}

/** Signed USD with explicit + / − — for PnL. */
export function formatSignedUsd(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (n == null || Number.isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return sign + formatUsd(n)
}

/** Compact for market cap / volume: $1.24B, $12.0M. */
export function formatCompact(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (n == null || Number.isNaN(n)) return '—'
  return fixMinus(
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(n),
  )
}

export function formatNumber(value: number | string | null | undefined, decimals = 2): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (n == null || Number.isNaN(n)) return '—'
  return fixMinus(
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n),
  )
}

export function formatCompactNumber(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (n == null || Number.isNaN(n)) return '—'
  return fixMinus(new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(n))
}

/** Signed percent with arrow-free sign; pair with an arrow glyph in the UI. */
export function formatPercent(value: number | string | null | undefined, decimals = 2): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (n == null || Number.isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return fixMinus(`${sign}${n.toFixed(decimals)}%`)
}

/** Trim a coin amount to a sensible token precision. */
export function formatToken(value: number | string | null | undefined, decimals = 6): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (n == null || Number.isNaN(n)) return '—'
  return fixMinus(
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(n),
  )
}

export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' ? parseFloat(value) : (value as number)
  return n == null || Number.isNaN(n) ? fallback : n
}
