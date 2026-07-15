import { Link } from 'react-router-dom'
import { useAuth } from '@/providers/AuthProvider'
import { useBinanceTickers } from '@/hooks/useBinanceTickers'
import { CoinIcon } from '@/components/coin/CoinIcon'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/live/Price'
import { ChangePill } from '@/components/live/ChangePill'
import { LiveDot } from '@/components/live/LiveDot'
import { formatUsd } from '@/lib/format'

const STRIP = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT']
const BOARD_ROWS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']

const base = (s: string) => s.replace('USDT', '')

export default function Home() {
  const { user } = useAuth()
  const tickers = useBinanceTickers(STRIP)
  const ctaTo = user ? '/trade' : '/signup'
  const btc = tickers['BTCUSDT']

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 grain opacity-[0.05]" aria-hidden />

      {/* live ticker tape — real data on a slow, seamless loop */}
      <div className="relative border-b border-border bg-surface-1">
        <div className="overflow-hidden py-2.5 [mask-image:linear-gradient(to_right,transparent,#000_48px,#000_calc(100%-48px),transparent)]">
          <div className="marquee flex w-max gap-10">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 gap-10" aria-hidden={copy === 1}>
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
            ))}
          </div>
        </div>
      </div>

      {/* hero — one column, the live board is the signature artifact */}
      <section className="relative mx-auto max-w-[1600px] px-4 sm:px-6">
        <div className="max-w-3xl pt-16 lg:pt-24">
          <h1 className="font-display text-5xl leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            Trade the real market
            <br />
            with <em className="not-italic text-accent">unreal</em> money.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Live Binance order books, leverage to 125×, a server-side matching engine — and $10,000 of
            paper money to learn on.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Button size="lg" asChild>
              <Link to={ctaTo}>{user ? 'Open terminal' : 'Start trading free'}</Link>
            </Button>
            <Link to="/markets" className="text-sm font-medium text-muted transition-colors hover:text-text">
              Explore markets <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>

        {/* the live board — real, populated, bleeding into the section below */}
        <div className="relative mt-14 -mb-16 lg:mt-16 lg:-mb-24">
          <Bracket className="-left-2 -top-2 border-l-2 border-t-2" />
          <Bracket className="-right-2 -top-2 border-r-2 border-t-2" />
          <Bracket className="-bottom-2 -left-2 border-b-2 border-l-2" />
          <Bracket className="-bottom-2 -right-2 border-b-2 border-r-2" />

          <div className="panel relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="text-sm font-semibold text-muted">Live markets</span>
              <LiveDot status={Object.keys(tickers).length ? 'live' : 'connecting'} />
            </div>
            <div>
              {BOARD_ROWS.map((s) => {
                const t = tickers[s]
                return (
                  <Link
                    key={s}
                    to="/markets"
                    className="flex items-center justify-between border-b border-hairline px-5 py-3.5 transition-colors last:border-b-0 hover:bg-surface-2"
                  >
                    <div className="flex items-center gap-3">
                      <CoinIcon symbol={base(s)} size={32} />
                      <div>
                        <div className="font-semibold">{base(s)}</div>
                        <div className="text-xs text-faint">{base(s)} / USDT · Perp</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Price value={t?.price ?? null} className="justify-end text-base font-semibold" />
                      <ChangePill value={t?.changePct ?? 0} variant="bare" className="justify-end text-xs" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* what it runs on — a ledger, not a card grid */}
      <section className="relative border-t border-border bg-surface-1">
        <div className="mx-auto max-w-[1600px] px-4 pb-16 pt-28 sm:px-6 lg:pb-20 lg:pt-36">
          <h2 className="font-display max-w-2xl text-3xl tracking-tight sm:text-4xl">
            Everything is real except the money.
          </h2>

          <div className="mt-10 grid gap-x-16 gap-y-8 md:grid-cols-2">
            <Feature
              mark={<MarkFeed />}
              title="Real-time data"
              desc="Direct Binance WebSocket feeds — mark price, depth-20 order book, and live klines stream straight to your browser."
            />
            <Feature
              mark={<MarkLever />}
              title="Up to 125× leverage"
              desc="Open long or short perpetual positions with adjustable margin."
            />
            <Feature
              mark={<MarkSettle />}
              title="Server-authoritative"
              desc="Prices are settled server-side and balances are concurrency-safe — no client-side cheating."
            />
            <Feature
              mark={<MarkCandles />}
              title="Pro charting"
              desc="TradingView's lightweight-charts with candles, crosshair, and timeframes from 1m to 1D."
            />
            <Feature
              mark={<MarkStack />}
              title="Spot + portfolio"
              desc="Buy, sell and convert spot assets with a live portfolio breakdown."
            />
          </div>
        </div>
      </section>

      {/* how it works — big numerals, no rails, no tiles */}
      <section className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:py-20">
        <h2 className="font-display text-3xl tracking-tight sm:text-4xl">Start in under a minute.</h2>
        <div className="mt-10 grid gap-10 md:grid-cols-3">
          <Step n="1" title="Create an account" desc="Sign up and instantly receive $10,000 in virtual trading funds." />
          <Step n="2" title="Pick a market" desc="Choose from BTC, ETH, SOL and more — watch the live order book and chart." />
          <Step n="3" title="Trade risk-free" desc="Set your margin and leverage, then open and manage positions with live PnL." />
        </div>
      </section>

      {/* closing — one line, one action, real data */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-6 px-4 py-14 sm:px-6">
          <div>
            <h2 className="font-display text-3xl tracking-tight sm:text-4xl">Ready when the market is.</h2>
            <p className="mt-2 text-muted">
              {btc ? (
                <>
                  BTC is trading at <span className="font-num text-text">{formatUsd(btc.price)}</span> right now —
                  practice on the live tape.
                </>
              ) : (
                'Practice on the live tape with zero risk and real market data.'
              )}
            </p>
          </div>
          <Button size="lg" asChild>
            <Link to={ctaTo}>{user ? 'Open terminal' : 'Get started — it’s free'}</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}

/* HUD corner bracket — the house silhouette, reused nowhere else at this size */
function Bracket({ className }: { className: string }) {
  return <span aria-hidden className={`absolute size-4 border-accent/50 ${className}`} />
}

function Feature({ mark, title, desc }: { mark: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4 border-t border-border pt-6">
      <span className="mt-0.5 shrink-0 text-accent">{mark}</span>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
      </div>
    </div>
  )
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div>
      <div className="font-display text-6xl leading-none text-faint">{n}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  )
}

/* ── Bespoke marks — one house style: 20px grid, 1.6 stroke, square caps,
      every mark built from market geometry (bars, candles, ladders). ── */

const markProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  'aria-hidden': true,
} as const

/* order-book depth ladder */
function MarkFeed() {
  return (
    <svg {...markProps}>
      <path d="M3 4h14M3 8h10M3 12h13M3 16h7" />
    </svg>
  )
}

/* lever over a fulcrum */
function MarkLever() {
  return (
    <svg {...markProps}>
      <path d="M3 14 17 6M8 17h4l-2-3.5z" />
    </svg>
  )
}

/* price bar locked between brackets */
function MarkSettle() {
  return (
    <svg {...markProps}>
      <path d="M6 3H3v14h3M14 3h3v14h-3M10 6v8" />
    </svg>
  )
}

/* two candlesticks with wicks */
function MarkCandles() {
  return (
    <svg {...markProps}>
      <path d="M6.5 3v3M6.5 13v4M13.5 3v2M13.5 15v2" />
      <rect x="4.5" y="6" width="4" height="7" />
      <rect x="11.5" y="5" width="4" height="10" />
    </svg>
  )
}

/* portfolio stack */
function MarkStack() {
  return (
    <svg {...markProps}>
      <path d="M3 15h14M5 11h10M7 7h6" />
    </svg>
  )
}
