import { cn } from '@/lib/utils'

export type ConnStatus = 'live' | 'connecting' | 'offline'

const MAP: Record<ConnStatus, { color: string; label: string }> = {
  live: { color: 'bg-up', label: 'Live' },
  connecting: { color: 'bg-amber-400', label: 'Reconnecting' },
  offline: { color: 'bg-down', label: 'Offline' },
}

/** Connection indicator — so the UI never silently lies about staleness. */
export function LiveDot({ status, label, className }: { status: ConnStatus; label?: string; className?: string }) {
  const m = MAP[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-muted', className)}>
      <span className={cn('inline-flex size-2 rounded-full', m.color, status === 'live' && 'animate-pulse-dot')} />
      {label ?? m.label}
    </span>
  )
}
