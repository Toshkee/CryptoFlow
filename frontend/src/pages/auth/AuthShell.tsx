import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="relative grid min-h-[calc(100vh-60px)] place-items-center overflow-hidden px-4 py-12">
      {/* ambient violet glow */}
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Link to="/">
            <Logo className="h-14" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
        </div>

        <div className="panel p-6 shadow-2xl shadow-black/40">{children}</div>

        <p className="mt-5 text-center text-sm text-muted">{footer}</p>
      </div>
    </div>
  )
}
