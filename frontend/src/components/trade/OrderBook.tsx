import { useMemo } from 'react'
import type { OrderBook as OrderBookData } from '@/hooks/useBinanceStream'
import { Price } from '@/components/live/Price'
import { formatNumber, formatPrice, priceDecimals } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Row {
  price: number
  qty: number
  cumulative: number
}

function withCumulative(levels: { price: number; qty: number }[]): { rows: Row[]; max: number } {
  let running = 0
  const rows = levels.map((l) => {
    running += l.qty
    return { ...l, cumulative: running }
  })
  return { rows, max: running || 1 }
}

/**
 * Depth-shaded order-book ladder: translucent cumulative-size bars behind each
 * row, a centered spread/mark row, right-aligned sizes, color only on price.
 */
export function OrderBook({ data, markPrice }: { data: OrderBookData; markPrice: number | null }) {
  const asks = useMemo(() => withCumulative(data.asks), [data.asks])
  const bids = useMemo(() => withCumulative(data.bids), [data.bids])
  const max = Math.max(asks.max, bids.max)

  const bestAsk = data.asks[0]?.price
  const bestBid = data.bids[0]?.price
  const spread = bestAsk && bestBid ? bestAsk - bestBid : null
  const spreadPct = spread && bestBid ? (spread / bestBid) * 100 : null
  const dp = markPrice ? priceDecimals(markPrice) : 2

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Order book</span>
        <span className="font-num text-[11px] text-faint">Size</span>
      </div>

      {/* asks (reversed so best ask sits just above the spread) */}
      <div className="flex flex-1 flex-col justify-end">
        {[...asks.rows].reverse().map((r, i) => (
          <Level key={`a-${i}`} row={r} max={max} side="ask" dp={dp} />
        ))}
      </div>

      {/* spread / mark */}
      <div className="flex items-center justify-between border-y border-border bg-surface-2 px-3 py-1.5">
        <Price value={markPrice} decimals={dp} colorize className="text-sm font-semibold" />
        <span className="font-num text-[11px] text-faint">
          {spread != null ? `${formatPrice(spread, { decimals: dp })} (${spreadPct?.toFixed(3)}%)` : '—'}
        </span>
      </div>

      {/* bids */}
      <div className="flex flex-1 flex-col">
        {bids.rows.map((r, i) => (
          <Level key={`b-${i}`} row={r} max={max} side="bid" dp={dp} />
        ))}
      </div>
    </div>
  )
}

function Level({ row, max, side, dp }: { row: Row; max: number; side: 'ask' | 'bid'; dp: number }) {
  const pct = (row.cumulative / max) * 100
  return (
    <div className="relative flex items-center justify-between px-3 py-[3px] text-xs">
      <div
        className={cn('absolute inset-y-0 right-0', side === 'ask' ? 'bg-down-soft' : 'bg-up-soft')}
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      <span className={cn('font-num relative tabular-nums', side === 'ask' ? 'text-down' : 'text-up')}>
        {formatPrice(row.price, { decimals: dp })}
      </span>
      <span className="font-num relative tabular-nums text-muted">{formatNumber(row.qty, 3)}</span>
    </div>
  )
}
