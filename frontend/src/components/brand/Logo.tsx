import { cn } from '@/lib/utils'
import logoUrl from '@/assets/cryptoflow-logo.webp'

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt=""
      aria-hidden
      draggable={false}
      className={cn('h-9 w-auto select-none object-contain', className)}
    />
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="CryptoFlow"
      draggable={false}
      className={cn(
        'h-10 w-auto select-none object-contain drop-shadow-[0_2px_10px_rgba(111,69,245,0.35)]',
        className,
      )}
    />
  )
}
