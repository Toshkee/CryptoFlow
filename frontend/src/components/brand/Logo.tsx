import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('size-7', className)} fill="none" aria-hidden>
      <defs>
        <linearGradient id="cf-logo" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8F73FF" />
          <stop offset="1" stopColor="#6A45F5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#cf-logo)" />
      <g stroke="#fff" strokeWidth="3.4" strokeLinecap="round">
        <line x1="20" y1="14" x2="20" y2="50" />
        <line x1="32" y1="20" x2="32" y2="44" />
        <line x1="44" y1="10" x2="44" y2="54" />
      </g>
      <g fill="#fff">
        <rect x="15.5" y="24" width="9" height="16" rx="2.5" />
        <rect x="27.5" y="28" width="9" height="11" rx="2.5" fillOpacity="0.85" />
        <rect x="39.5" y="18" width="9" height="22" rx="2.5" />
      </g>
    </svg>
  )
}

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      {withText && (
        <span className="text-lg font-bold tracking-tight">
          Crypto<span className="text-accent">Flow</span>
        </span>
      )}
    </span>
  )
}
