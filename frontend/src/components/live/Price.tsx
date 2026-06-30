import { useEffect, useRef, useState } from 'react'
import NumberFlow from '@number-flow/react'
import { cn } from '@/lib/utils'
import { priceDecimals } from '@/lib/format'

interface PriceProps {
  value: number | null | undefined
  decimals?: number
  prefix?: string
  className?: string
  /** Tint the digits by tick direction (in addition to the bg flash). */
  colorize?: boolean
  flash?: boolean
}

/**
 * A live price readout. On every tick it (a) rolls digits via number-flow and
 * (b) pulses a green/red background so the eye catches the move — the single
 * highest-signal "this is live" cue in the whole UI.
 */
export function Price({ value, decimals, prefix = '', className, colorize = false, flash = true }: PriceProps) {
  const safe = value == null || Number.isNaN(value) ? 0 : value
  const prev = useRef(safe)
  const idRef = useRef(0)
  const [tick, setTick] = useState<{ dir: 'up' | 'down'; id: number } | null>(null)

  useEffect(() => {
    if (safe > prev.current) setTick({ dir: 'up', id: ++idRef.current })
    else if (safe < prev.current) setTick({ dir: 'down', id: ++idRef.current })
    prev.current = safe
  }, [safe])

  const dp = decimals ?? priceDecimals(safe)

  return (
    <span className={cn('font-num relative inline-flex items-center rounded px-1 tabular-nums', className)}>
      {flash && tick && (
        <span
          key={tick.id}
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 rounded',
            tick.dir === 'up' ? 'animate-flash-up' : 'animate-flash-down',
          )}
        />
      )}
      <span className={cn('relative', colorize && tick?.dir === 'up' && 'text-up', colorize && tick?.dir === 'down' && 'text-down')}>
        {value == null || Number.isNaN(value) ? (
          <span className="text-faint">—</span>
        ) : (
          <NumberFlow
            value={safe}
            prefix={prefix}
            format={{ minimumFractionDigits: dp, maximumFractionDigits: dp }}
          />
        )}
      </span>
    </span>
  )
}
