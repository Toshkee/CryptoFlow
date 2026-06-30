import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A coin logo resolved from just a ticker symbol, with graceful fallback.
 *
 * Pages that already have a CoinGecko image (Markets, CoinDetail) pass it as
 * `src` for best quality. Pages that only know a symbol (Trade, Home, Wallet)
 * rely on the symbol-keyed CDNs. Sources are tried in order on load error, and
 * if every one fails we render a tinted initials circle — so a coin always has
 * an icon and a broken image never shows.
 */

// Strip a trailing quote-currency so "BTCUSDT" and "BTC" both resolve to "btc".
function baseTicker(symbol: string): string {
  const s = (symbol || '').toLowerCase()
  for (const q of ['usdt', 'busd', 'usdc', 'usd']) {
    if (s.endsWith(q) && s.length > q.length) return s.slice(0, -q.length)
  }
  return s
}

function cdnSources(symbol: string): string[] {
  const s = baseTicker(symbol)
  if (!s) return []
  return [
    // Reliable for majors (jsDelivr/npm), gaps on newer coins.
    `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/128/color/${s}.png`,
    // Broader coverage, fills the gaps (NEAR, APT, ARB, OP, …).
    `https://assets.coincap.io/assets/icons/${s}@2x.png`,
  ]
}

export function CoinIcon({
  symbol,
  src,
  size = 28,
  className,
}: {
  symbol: string
  /** Preferred image (e.g. CoinGecko `coin.image`); tried before the CDNs. */
  src?: string | null
  size?: number
  className?: string
}) {
  const sources = (src ? [src] : []).concat(cdnSources(symbol))
  // Reset the fallback index when the coin (or its preferred src) changes,
  // without an effect, so a reused instance (e.g. the Trade symbol header)
  // doesn't get stuck on a stale source.
  const id = `${src ?? ''}|${baseTicker(symbol)}`
  const [state, setState] = useState({ id, idx: 0 })
  const idx = state.id === id ? state.idx : 0

  const box = { width: size, height: size, minWidth: size } as const

  if (idx >= sources.length) {
    return (
      <span
        className={cn(
          'inline-grid shrink-0 place-items-center rounded-full bg-surface-3 font-bold uppercase text-muted',
          className,
        )}
        style={{ ...box, fontSize: Math.max(8, size * 0.36) }}
        aria-hidden
      >
        {baseTicker(symbol).slice(0, 3)}
      </span>
    )
  }

  return (
    <img
      src={sources[idx]}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={cn('shrink-0 rounded-full bg-surface-3 object-cover', className)}
      style={box}
      onError={() => setState({ id, idx: idx + 1 })}
    />
  )
}
