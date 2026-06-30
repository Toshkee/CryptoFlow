import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-surface-3 text-text',
        up: 'border-transparent bg-up-soft text-up',
        down: 'border-transparent bg-down-soft text-down',
        accent: 'border-transparent bg-accent-soft text-accent',
        outline: 'border-border text-muted',
        long: 'border-transparent bg-up-soft text-up',
        short: 'border-transparent bg-down-soft text-down',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
