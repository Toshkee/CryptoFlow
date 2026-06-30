import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCoinDetail, useSpotWallet, useSpotMutation } from '@/hooks/queries'
import { PriceAreaChart, type AreaPoint } from '@/components/charts/PriceAreaChart'
import { ChangePill } from '@/components/live/ChangePill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCompact, formatPrice, formatToken, formatUsd, toNumber } from '@/lib/format'

export default function CoinDetail() {
  const { coin_id } = useParams()
  const { data, isLoading, isError } = useCoinDetail(coin_id)
  const { data: wallet } = useSpotWallet()
  const buy = useSpotMutation<{ coin_id: string; symbol: string; amount: string; price: number }>(
    '/markets/wallet/buy/',
  )

  const [buyOpen, setBuyOpen] = useState(false)
  const [amount, setAmount] = useState('')

  const chartData = useMemo<AreaPoint[]>(() => {
    const prices = data?.chart?.prices ?? []
    const seen = new Set<number>()
    const out: AreaPoint[] = []
    for (const [ms, price] of prices) {
      const time = Math.floor(ms / 1000)
      if (seen.has(time)) continue
      seen.add(time)
      out.push({ time, value: price })
    }
    return out
  }, [data])

  if (isLoading) return <DetailSkeleton />
  if (isError || !data?.info?.id) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-lg font-semibold">Coin data unavailable</p>
        <p className="mt-1 text-muted">We couldn’t load this asset right now.</p>
        <Button asChild className="mt-4">
          <Link to="/markets">Back to markets</Link>
        </Button>
      </div>
    )
  }

  const info = data.info
  const md = info.market_data
  const price = md.current_price.usd
  const change = md.price_change_percentage_24h
  const up = (change ?? 0) >= 0
  const balance = toNumber(wallet?.balance)

  const handleBuy = async () => {
    const usd = Number(amount)
    if (!usd || usd <= 0) return toast.error('Enter a valid USD amount')
    if (usd > balance) return toast.error('Insufficient balance')
    try {
      await buy.mutateAsync({ coin_id: info.id, symbol: info.symbol.toLowerCase(), amount, price })
      toast.success('Purchase complete', { description: `Bought ${formatUsd(usd)} of ${info.symbol.toUpperCase()}` })
      setBuyOpen(false)
      setAmount('')
    } catch (err) {
      toast.error('Purchase failed', { description: (err as Error).message })
    }
  }

  const qtyPreview = amount && price ? Number(amount) / price : 0

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">
      <Link to="/markets" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Markets
      </Link>

      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <img src={info.image.large} alt="" className="size-12 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {info.name} <span className="text-muted">{info.symbol.toUpperCase()}</span>
            </h1>
            <div className="mt-1 flex items-center gap-3">
              <span className="font-num text-2xl font-semibold tabular-nums">${formatPrice(price)}</span>
              <ChangePill value={change} />
            </div>
          </div>
        </div>
        <Button size="lg" onClick={() => setBuyOpen(true)}>
          Buy {info.symbol.toUpperCase()}
        </Button>
      </div>

      {/* chart */}
      <div className="panel mt-6 p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">7-day price</h2>
        </div>
        {chartData.length > 2 ? (
          <PriceAreaChart data={chartData} up={up} />
        ) : (
          <p className="py-12 text-center text-muted">No chart data available.</p>
        )}
      </div>

      {/* stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Market cap" value={formatCompact(md.market_cap.usd)} />
        <Stat label="24h volume" value={formatCompact(md.total_volume.usd)} />
        <Stat label="24h high" value={md.high_24h ? `$${formatPrice(md.high_24h.usd)}` : '—'} />
        <Stat label="24h low" value={md.low_24h ? `$${formatPrice(md.low_24h.usd)}` : '—'} />
        <Stat label="Circulating" value={formatToken(md.circulating_supply, 0)} />
        <Stat label="Max supply" value={md.max_supply ? formatToken(md.max_supply, 0) : '∞'} />
      </div>

      {/* about */}
      {info.description?.en && (
        <div className="panel mt-6 p-6">
          <h2 className="mb-3 text-lg font-semibold">About {info.name}</h2>
          <p className="text-sm leading-relaxed text-muted">
            {info.description.en.replace(/<[^>]+>/g, '').slice(0, 1200) || 'No description available.'}
          </p>
        </div>
      )}

      {/* buy dialog */}
      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buy {info.symbol.toUpperCase()}</DialogTitle>
            <DialogDescription>
              Balance {formatUsd(balance)} · Price ${formatPrice(price)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="buy-amt">Amount (USD)</Label>
            <Input
              id="buy-amt"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              prefix="$"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {qtyPreview > 0 && (
              <p className="text-xs text-muted">
                ≈ <span className="font-num text-text">{formatToken(qtyPreview)}</span> {info.symbol.toUpperCase()}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              {[25, 50, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setAmount(((balance * pct) / 100).toFixed(2))}
                  className="flex-1 rounded-md border border-border bg-surface-3 py-1.5 text-xs font-medium text-muted hover:text-text"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full" onClick={handleBuy} disabled={buy.isPending}>
              {buy.isPending && <Loader2 className="animate-spin" />}
              Confirm purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-4">
      <div className="text-xs uppercase tracking-wide text-faint">{label}</div>
      <div className="mt-1 font-num text-base font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-8 sm:px-6">
      <Skeleton className="h-5 w-20" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-7 w-40" />
        </div>
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
