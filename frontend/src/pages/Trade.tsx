import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Loader2, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import { MARKETS, useUIStore, type OrderSide, type TradeInterval } from '@/stores/useUIStore'
import { useBinanceStream } from '@/hooks/useBinanceStream'
import type { Candle } from '@/components/charts/CandleChart'
import { useBinanceTickers } from '@/hooks/useBinanceTickers'
import { CoinIcon } from '@/components/coin/CoinIcon'
import { useFuturesWallet, usePositions, useOpenPosition, useClosePosition } from '@/hooks/queries'
import type { Position } from '@/types'
import { CandleChart } from '@/components/charts/CandleChart'
import { OrderBook } from '@/components/trade/OrderBook'
import { TradesTape } from '@/components/trade/TradesTape'
import { Price } from '@/components/live/Price'
import { ChangePill } from '@/components/live/ChangePill'
import { LiveDot } from '@/components/live/LiveDot'
import { AnimatedNumber } from '@/components/live/AnimatedNumber'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TransferDialog } from '@/components/trade/TransferDialog'
import { formatPrice, formatSignedUsd, formatToken, formatUsd, toNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const INTERVALS: TradeInterval[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d']
const LEV_PRESETS = [5, 10, 20, 50, 100, 125]
const base = (s: string) => s.replace('USDT', '')

async function fetchKlines(symbol: string, interval: string): Promise<Candle[]> {
  // Binance spot REST (api.binance.com) — matches the spot streams we subscribe
  // to and is reachable where the futures endpoints are geo-blocked.
  const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=300`)
  const raw: (string | number)[][] = await r.json()
  return raw.map((c) => ({
    time: Math.floor(Number(c[0]) / 1000),
    open: +c[1],
    high: +c[2],
    low: +c[3],
    close: +c[4],
  }))
}

export default function Trade() {
  const { symbol, interval, leverage, side, bookTab, setSymbol, setInterval, setLeverage, setSide, setBookTab } =
    useUIStore()
  const { price: markPrice, orderbook, candle, trades, status } = useBinanceStream(symbol, interval)

  const { data: positions } = usePositions()
  const { data: wallet } = useFuturesWallet()
  const open = useOpenPosition()
  const closePos = useClosePosition()

  // One ticker subscription powers the watchlist AND PnL for every open symbol.
  const watchSymbols = useMemo(() => {
    const set = new Set<string>(MARKETS as readonly string[])
    positions?.forEach((p) => set.add(p.symbol))
    return [...set]
  }, [positions])
  const tickers = useBinanceTickers(watchSymbols)

  const { data: klines } = useQuery({
    queryKey: ['klines', symbol, interval],
    queryFn: () => fetchKlines(symbol, interval),
    staleTime: 60_000,
  })

  const [margin, setMargin] = useState('')
  const [transferOpen, setTransferOpen] = useState(false)

  const priceFor = (sym: string) => (sym === symbol && markPrice ? markPrice : tickers[sym]?.price ?? null)
  const balance = toNumber(wallet?.balance)
  const change24 = tickers[symbol]?.changePct ?? 0

  const orderValue = margin && markPrice ? Number(margin) * leverage : 0
  const orderSize = orderValue && markPrice ? orderValue / markPrice : 0
  const liqEstimate =
    markPrice && leverage
      ? side === 'BUY'
        ? markPrice * (1 - 1 / leverage)
        : markPrice * (1 + 1 / leverage)
      : null

  const submit = async () => {
    const m = Number(margin)
    if (!m || m <= 0) return toast.error('Enter a valid margin amount')
    if (m > balance) return toast.error('Insufficient balance')
    try {
      await open.mutateAsync({ symbol, side, leverage, margin, price: markPrice })
      toast.success('Position opened', {
        description: `${side === 'BUY' ? 'Long' : 'Short'} ${base(symbol)} · ${leverage}× · ${formatUsd(m)} margin`,
      })
      setMargin('')
    } catch (e) {
      toast.error('Order failed', { description: (e as Error).message })
    }
  }

  const close = async (p: Position) => {
    try {
      const res = await closePos.mutateAsync({ id: p.id, price: priceFor(p.symbol) })
      const pnl = toNumber(res.pnl)
      toast[pnl >= 0 ? 'success' : 'error'](`Position closed`, { description: `Realized PnL ${formatSignedUsd(pnl)}` })
    } catch (e) {
      toast.error('Close failed', { description: (e as Error).message })
    }
  }

  return (
    <div className="flex flex-col">
      {/* topbar */}
      <div className="sticky top-15 z-30 border-b border-border bg-bg/90 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="h-9 w-auto min-w-36 whitespace-nowrap bg-surface-2 font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARKETS.map((m) => (
                <SelectItem key={m} value={m}>
                  <span className="flex items-center gap-2">
                    <CoinIcon symbol={m} size={18} />
                    {base(m)} <span className="text-faint">/ USDT</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Price value={markPrice} className="text-xl font-bold" colorize />

          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-faint">24h change</span>
            <ChangePill value={change24} variant="bare" />
          </div>

          <Badge variant="accent" className="hidden sm:inline-flex">
            Perpetual
          </Badge>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-faint">Trading balance</span>
              <span className="font-num tabular-nums text-sm font-bold text-text">{formatUsd(balance)}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft className="size-3.5" /> Transfer
            </Button>
            <LiveDot status={status} />
          </div>
        </div>
      </div>

      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} futuresBalance={balance} />

      {/* main grid */}
      <div className="grid gap-3 p-3 lg:grid-cols-[208px_1fr_320px]">
        {/* watchlist */}
        <aside className="hidden flex-col overflow-hidden rounded-xl border border-border bg-surface-1 lg:flex">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Markets
          </div>
          <div className="flex-1 overflow-y-auto">
            {MARKETS.map((m) => {
              const t = tickers[m]
              const active = m === symbol
              return (
                <button
                  key={m}
                  onClick={() => setSymbol(m)}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors',
                    active ? 'bg-surface-2' : 'hover:bg-surface-2/60',
                  )}
                >
                  <span className="flex items-center gap-2">
                    {active && <span className="h-3.5 w-0.5 rounded-full bg-accent" />}
                    <CoinIcon symbol={m} size={20} className={cn(!active && 'ml-2.5')} />
                    <span className="font-medium">{base(m)}</span>
                  </span>
                  <span className="text-right">
                    <Price value={t?.price ?? null} className="block text-xs" flash={false} />
                    <ChangePill value={t?.changePct ?? 0} variant="bare" showIcon={false} className="text-[11px]" />
                  </span>
                </button>
              )
            })}
          </div>
        </aside>

        {/* center: chart + positions */}
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
            <div className="flex items-center gap-1 border-b border-border px-3 py-2">
              {INTERVALS.map((iv) => (
                <button
                  key={iv}
                  onClick={() => setInterval(iv)}
                  className={cn(
                    'relative rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-colors',
                    interval === iv ? 'text-text' : 'text-muted hover:text-text',
                  )}
                >
                  {interval === iv && (
                    <motion.span
                      layoutId="interval-pill"
                      className="absolute inset-0 rounded-md bg-surface-3"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{iv}</span>
                </button>
              ))}
            </div>
            <CandleChart data={klines} liveCandle={candle} height={420} />
          </div>

          <PositionsPanel
            positions={positions ?? []}
            priceFor={priceFor}
            onClose={close}
            closing={closePos.isPending}
          />
        </div>

        {/* right: orderbook + order form */}
        <div className="flex flex-col gap-3">
          <div className="flex h-[320px] flex-col overflow-hidden rounded-xl border border-border bg-surface-1">
            <div className="flex shrink-0 border-b border-border">
              {(['book', 'trades'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBookTab(tab)}
                  className={cn(
                    'relative flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors',
                    bookTab === tab ? 'text-text' : 'text-muted hover:text-text',
                  )}
                >
                  {tab === 'book' ? 'Order book' : 'Trades'}
                  {bookTab === tab && (
                    <motion.span layoutId="book-tab" className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />
                  )}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">
              {bookTab === 'book' ? (
                <OrderBook data={orderbook} markPrice={markPrice} />
              ) : (
                <TradesTape trades={trades} markPrice={markPrice} />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-1 p-3">
            {/* side toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSide('BUY')}
                className={cn(
                  'rounded-md py-2 text-sm font-bold transition-colors',
                  side === 'BUY' ? 'bg-up text-black' : 'bg-surface-2 text-muted hover:text-text',
                )}
              >
                Buy / Long
              </button>
              <button
                onClick={() => setSide('SELL')}
                className={cn(
                  'rounded-md py-2 text-sm font-bold transition-colors',
                  side === 'SELL' ? 'bg-down text-white' : 'bg-surface-2 text-muted hover:text-text',
                )}
              >
                Sell / Short
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>Available</span>
              <span className="font-num tabular-nums text-text">{formatUsd(balance)}</span>
            </div>

            <div className="mt-3 space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted">Margin (USDT)</label>
              <Input type="number" inputMode="decimal" placeholder="0.00" prefix="$" value={margin} onChange={(e) => setMargin(e.target.value)} />
              <div className="flex gap-1.5">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setMargin(((balance * pct) / 100).toFixed(2))}
                    className="flex-1 rounded-md border border-border bg-surface-2 py-1 text-[11px] font-medium text-muted hover:text-text"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium uppercase tracking-wide text-muted">Leverage</span>
                <span className="font-num font-bold text-accent">{leverage}×</span>
              </div>
              <Slider value={[leverage]} min={1} max={125} step={1} onValueChange={([v]) => setLeverage(v)} />
              <div className="flex gap-1.5">
                {LEV_PRESETS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLeverage(l)}
                    className={cn(
                      'flex-1 rounded-md border py-1 text-[11px] font-medium transition-colors',
                      leverage === l ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface-2 text-muted hover:text-text',
                    )}
                  >
                    {l}×
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-1.5 rounded-lg bg-surface-2 p-3 text-xs">
              <Row label="Order value" value={formatUsd(orderValue)} />
              <Row label="Size" value={`${formatToken(orderSize)} ${base(symbol)}`} />
              <Row label="Est. liquidation" value={liqEstimate ? `$${formatPrice(liqEstimate)}` : '—'} accent={side === 'SELL' ? 'down' : 'up'} />
            </div>

            <Button
              variant={side === 'BUY' ? 'up' : 'down'}
              size="lg"
              className="mt-3 w-full"
              onClick={submit}
              disabled={open.isPending}
            >
              {open.isPending && <Loader2 className="animate-spin" />}
              {side === 'BUY' ? 'Open Long' : 'Open Short'} {base(symbol)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: 'up' | 'down' }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={cn('font-num tabular-nums', accent === 'up' && 'text-up', accent === 'down' && 'text-down')}>
        {value}
      </span>
    </div>
  )
}

function PositionsPanel({
  positions,
  priceFor,
  onClose,
  closing,
}: {
  positions: Position[]
  priceFor: (s: string) => number | null
  onClose: (p: Position) => void
  closing: boolean
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-1">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Open positions</span>
        <Badge variant="outline">{positions.length}</Badge>
      </div>

      {positions.length === 0 ? (
        <p className="px-3 py-8 text-center text-sm text-muted">No open positions. Place an order to get started.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs uppercase tracking-wide text-faint">
              <tr>
                <th className="py-2 pl-3 text-left font-medium">Symbol</th>
                <th className="py-2 text-left font-medium">Side</th>
                <th className="py-2 text-right font-medium">Size</th>
                <th className="py-2 text-right font-medium">Entry</th>
                <th className="py-2 text-right font-medium">Mark</th>
                <th className="py-2 text-right font-medium">Liq.</th>
                <th className="py-2 text-right font-medium">PnL (ROE)</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const mark = priceFor(p.symbol)
                const entry = toNumber(p.entry_price)
                const amt = toNumber(p.amount)
                const margin = toNumber(p.initial_margin)
                const pnl = mark ? (p.side === 'LONG' ? (mark - entry) * amt : (entry - mark) * amt) : 0
                const roe = margin ? (pnl / margin) * 100 : 0
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2.5 pl-3 font-semibold">
                      <span className="flex items-center gap-2">
                        <CoinIcon symbol={p.symbol} size={20} />
                        {base(p.symbol)}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <Badge variant={p.side === 'LONG' ? 'long' : 'short'}>{p.side}</Badge>
                    </td>
                    <td className="py-2.5 text-right font-num tabular-nums">{formatToken(amt)}</td>
                    <td className="py-2.5 text-right font-num tabular-nums text-muted">{formatPrice(entry)}</td>
                    <td className="py-2.5 text-right">
                      <Price value={mark} className="justify-end text-xs" flash={false} />
                    </td>
                    <td className="py-2.5 text-right font-num tabular-nums text-faint">
                      {formatPrice(toNumber(p.liquidation_price))}
                    </td>
                    <td className={cn('py-2.5 text-right font-num font-semibold tabular-nums', pnl >= 0 ? 'text-up' : 'text-down')}>
                      <AnimatedNumber value={pnl} format={{ style: 'currency', currency: 'USD', signDisplay: 'always' }} />
                      <span className="ml-1 text-[11px] opacity-80">({roe >= 0 ? '+' : ''}{roe.toFixed(1)}%)</span>
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      <Button size="sm" variant="secondary" onClick={() => onClose(p)} disabled={closing}>
                        Close
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
