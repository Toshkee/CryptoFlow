import type { Trade } from '@/hooks/useBinanceStream'
import { formatNumber, formatPrice, priceDecimals } from '@/lib/format'
import { cn } from '@/lib/utils'

function fmtTime(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/**
 * Live market-trades tape — most-recent executed trades, newest on top.
 * Green = aggressive buy (long-side), red = aggressive sell (short-side).
 */
export function TradesTape({ trades, markPrice }: { trades: Trade[]; markPrice: number | null }) {
  const dp = markPrice ? priceDecimals(markPrice) : 2

  return (
    <div className="flex h-full flex-col">
      <div className="grid shrink-0 grid-cols-[1fr_1fr_auto] gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Time</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {trades.length === 0 ? (
          <div className="grid h-full place-items-center text-xs text-faint">Waiting for trades…</div>
        ) : (
          trades.map((t) => (
            <div key={t.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 py-[3px] text-xs">
              <span className={cn('font-num tabular-nums', t.side === 'buy' ? 'text-up' : 'text-down')}>
                {formatPrice(t.price, { decimals: dp })}
              </span>
              <span className="font-num text-right tabular-nums text-muted">{formatNumber(t.qty, 3)}</span>
              <span className="font-num text-right tabular-nums text-faint">{fmtTime(t.time)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
