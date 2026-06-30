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
      <span className="relative flex size-2">
        {status === 'live' && (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', m.color)} />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', m.color)} />
      </span>
      {label ?? m.label}
    </span>
  )
}
