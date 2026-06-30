import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPercent } from '@/lib/format'

interface ChangePillProps {
  value: number | null | undefined
  className?: string
  /** 'pill' = soft bg chip, 'bare' = colored text only */
  variant?: 'pill' | 'bare'
  showIcon?: boolean
}

/** 24h-change indicator. Never color-only: always carries an arrow + sign. */
export function ChangePill({ value, className, variant = 'pill', showIcon = true }: ChangePillProps) {
  const n = value == null || Number.isNaN(value) ? 0 : value
  const up = n >= 0
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <span
      className={cn(
        'font-num inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums',
        up ? 'text-up' : 'text-down',
        variant === 'pill' && 'rounded-md px-1.5 py-0.5',
        variant === 'pill' && (up ? 'bg-up-soft' : 'bg-down-soft'),
        className,
      )}
    >
      {showIcon && <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />}
      {formatPercent(n)}
    </span>
  )
}
