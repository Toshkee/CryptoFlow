import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 select-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-accent text-on-accent hover:bg-accent-hover shadow-[0_0_0_0_var(--color-accent-glow)] hover:shadow-[0_6px_24px_-6px_var(--color-accent-glow)] active:scale-[0.98]',
        secondary: 'bg-surface-2 text-text hover:bg-surface-3 border border-border',
        outline: 'border border-border bg-transparent text-text hover:bg-surface-2 hover:border-surface-3',
        ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-text',
        up: 'bg-up text-black hover:brightness-110 active:scale-[0.98] font-bold',
        down: 'bg-down text-white hover:brightness-110 active:scale-[0.98] font-bold',
        destructive: 'bg-down/15 text-down hover:bg-down/25 border border-down/30',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
