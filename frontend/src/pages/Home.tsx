import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Activity,
  Gauge,
  LineChart,
  Lock,
  ShieldCheck,
  Wallet as WalletIcon,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { useBinanceTickers } from '@/hooks/useBinanceTickers'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/live/Price'
import { ChangePill } from '@/components/live/ChangePill'
import { LiveDot } from '@/components/live/LiveDot'
import { cn } from '@/lib/utils'

const STRIP = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT']
const HERO_ROWS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']

const base = (s: string) => s.replace('USDT', '')

export default function Home() {
  const { user } = useAuth()
  const tickers = useBinanceTickers(STRIP)
  const ctaTo = user ? '/trade' : '/signup'

  return (
    <div className="overflow-hidden">
      {/* live ticker strip */}
      <div className="border-b border-border bg-surface-1">
        <div className="mx-auto flex max-w-[1600px] gap-6 overflow-x-auto px-4 py-2.5 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STRIP.map((s) => {
            const t = tickers[s]
            return (
              <div key={s} className="flex shrink-0 items-center gap-2 text-sm">
                <span className="font-medium text-muted">{base(s)}</span>
                <Price value={t?.price ?? null} className="text-text" />
                {t && <ChangePill value={t.changePct} variant="bare" showIcon={false} className="text-xs" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* hero */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
        <div className="pointer-events-none absolute -top-20 left-1/4 h-[400px] w-[600px] rounded-full bg-accent/10 blur-[140px]" />

        <div className="relative mx-auto grid max-w-[1600px] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              Real-time perpetual futures · paper money
            </span>

            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Trade crypto futures
              <br />
              <span className="text-gradient">like a pro terminal.</span>
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-muted">
              Live Binance order books and candlesticks, leverage up to 125×, and a server-authoritative matching
              engine — all with risk-free paper money. Built to feel like the real thing.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link to={ctaTo}>
                  {user ? 'Open terminal' : 'Start trading free'} <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/markets">Explore markets</Link>
              </Button>
            </div>

            <p className="text-sm text-faint">
              Sign up and get <span className="font-semibold text-text">$10,000</span> in virtual funds. No card, no
              risk.
            </p>
          </div>

          {/* live terminal card */}
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-accent/5 blur-2xl" />
            <div className="panel relative overflow-hidden p-5 shadow-2xl shadow-black/40">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted">Live markets</span>
                <LiveDot status={Object.keys(tickers).length ? 'live' : 'connecting'} />
              </div>
              <div className="space-y-1">
                {HERO_ROWS.map((s) => {
                  const t = tickers[s]
                  const up = (t?.changePct ?? 0) >= 0
                  return (
                    <div
                      key={s}
                      className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-surface-2"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'grid size-9 place-items-center rounded-full text-xs font-bold',
                            up ? 'bg-up-soft text-up' : 'bg-down-soft text-down',
                          )}
                        >
                          {base(s).slice(0, 3)}
                        </span>
                        <div>
                          <div className="font-semibold">{base(s)}</div>
                          <div className="text-xs text-faint">{base(s)} / USDT · Perp</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Price value={t?.price ?? null} className="justify-end text-base font-semibold" />
                        <ChangePill value={t?.changePct ?? 0} variant="bare" className="justify-end text-xs" />
                      </div>
                    </div>
                  )
                })}
              </div>
              <Button variant="secondary" className="mt-4 w-full" asChild>
                <Link to="/markets">View all markets</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* feature bento */}
      <section className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon={<Activity />}
            title="Real-time data"
            desc="Direct Binance WebSocket feeds — mark price, depth-20 order book, and live klines stream straight to your browser."
            className="lg:col-span-2"
          />
          <Feature icon={<Gauge />} title="Up to 125× leverage" desc="Open long or short perpetual positions with adjustable margin." />
          <Feature icon={<ShieldCheck />} title="Server-authoritative" desc="Prices are settled server-side and balances are concurrency-safe — no client-side cheating." />
          <Feature icon={<LineChart />} title="Pro charting" desc="TradingView's lightweight-charts with candles, crosshair, and timeframes from 1m to 1D." />
          <Feature icon={<WalletIcon />} title="Spot + portfolio" desc="Buy, sell and convert spot assets with a live portfolio breakdown." />
        </div>
      </section>

      {/* how it works */}
      <section className="border-t border-border bg-surface-1">
        <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">Start in under a minute</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <Step n="01" icon={<Zap />} title="Create an account" desc="Sign up and instantly receive $10,000 in virtual trading funds." />
            <Step n="02" icon={<LineChart />} title="Pick a market" desc="Choose from BTC, ETH, SOL and more — watch the live order book and chart." />
            <Step n="03" icon={<Lock />} title="Trade risk-free" desc="Set your margin and leverage, then open and manage positions with live PnL." />
          </div>
        </div>
      </section>

      {/* final CTA */}
      <section className="mx-auto max-w-[1600px] px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-1 p-10 text-center">
          <div className="pointer-events-none absolute inset-0 bg-accent/5" />
          <div className="relative space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Ready to make your first trade?</h2>
            <p className="mx-auto max-w-md text-muted">Practice trading perpetual futures with zero risk and real market data.</p>
            <Button size="lg" asChild>
              <Link to={ctaTo}>
                {user ? 'Open terminal' : 'Get started — it’s free'} <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function Feature({
  icon,
  title,
  desc,
  className,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  className?: string
}) {
  return (
    <div className={cn('group rounded-xl border border-border bg-surface-1 p-6 transition-colors hover:border-surface-3', className)}>
      <div className="mb-4 grid size-10 place-items-center rounded-lg bg-accent-soft text-accent [&_svg]:size-5">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  )
}

function Step({ n, icon, title, desc }: { n: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg border border-border bg-surface-2 text-accent [&_svg]:size-5">
          {icon}
        </span>
        <span className="font-num text-sm text-faint">{n}</span>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  )
}
