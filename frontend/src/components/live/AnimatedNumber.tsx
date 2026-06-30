import { type ComponentProps } from 'react'
import NumberFlow from '@number-flow/react'
import { cn } from '@/lib/utils'

interface AnimatedNumberProps {
  value: number
  format?: Intl.NumberFormatOptions
  prefix?: string
  suffix?: string
  className?: string
}

/** Smoothly rolls digits between values (balance, PnL, equity). */
export function AnimatedNumber({ value, format, prefix, suffix, className }: AnimatedNumberProps) {
  return (
    <NumberFlow
      value={Number.isFinite(value) ? value : 0}
      format={format as ComponentProps<typeof NumberFlow>['format']}
      prefix={prefix}
      suffix={suffix}
      className={cn('font-num tabular-nums', className)}
    />
  )
}
