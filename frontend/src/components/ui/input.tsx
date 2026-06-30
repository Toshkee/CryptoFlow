import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  prefix?: React.ReactNode
  suffix?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, prefix, suffix, ...props }, ref) => {
    if (prefix || suffix) {
      return (
        <div
          className={cn(
            'flex h-11 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30',
            className,
          )}
        >
          {prefix && <span className="shrink-0 text-sm text-muted">{prefix}</span>}
          <input
            ref={ref}
            type={type}
            className="font-num h-full w-full bg-transparent text-text placeholder:text-faint focus:outline-none"
            {...props}
          />
          {suffix && <span className="shrink-0 text-sm text-muted">{suffix}</span>}
        </div>
      )
    }
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-11 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text transition-colors placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
