import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, Loader2, Repeat, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import { apiGet } from '@/lib/api'
import { useSpotWallet, useSpotMutation, useFuturesWallet, useTop100 } from '@/hooks/queries'
import { useBinanceTickers } from '@/hooks/useBinanceTickers'
import { CoinIcon } from '@/components/coin/CoinIcon'
import { TransferDialog } from '@/components/trade/TransferDialog'
import type { SpotAsset } from '@/types'
import { AnimatedNumber } from '@/components/live/AnimatedNumber'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatToken, formatUsd, toNumber } from '@/lib/format'

const COLORS = ['#7c5cff', '#2ebd85', '#16e1a3', '#f6a700', '#f6465d', '#3aa0ff', '#b07cff', '#8b919a']

type ModalKind = null | 'deposit' | 'withdraw' | 'sell' | 'convert'

export default function Wallet() {
  const { data, isLoading } = useSpotWallet()
  const { data: futures } = useFuturesWallet()
  const { data: coins } = useTop100()
  const deposit = useSpotMutation<{ amount: string }>('/markets/wallet/deposit/')
  const withdraw = useSpotMutation<{ amount: string }>('/markets/wallet/withdraw/')
  const sell = useSpotMutation<{ coin_id: string; amount: string; price: string }>('/markets/wallet/sell/')
  const convert = useSpotMutation<{ from_coin: string; to_coin: string; amount: string; to_symbol?: string }>('/markets/wallet/convert/')

  const [modal, setModal] = useState<ModalKind>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [activeAsset, setActiveAsset] = useState<SpotAsset | null>(null)
  const [convertTo, setConvertTo] = useState('')
  const [preview, setPreview] = useState<{ to_amount: string; to_symbol: string } | null>(null)

  const assets = data?.assets ?? []

  // Value holdings off the live Binance spot stream so the portfolio ticks in
  // real time, instead of sitting frozen on the snapshot from the last fetch.
  const tickerSymbols = useMemo(() => assets.map((a) => `${a.symbol.toUpperCase()}USDT`), [assets])
  const tickers = useBinanceTickers(tickerSymbols)
  const liveAssets = assets.map((a) => {
    const livePrice = tickers[`${a.symbol.toUpperCase()}USDT`]?.price ?? toNumber(a.live_price)
    return { ...a, livePrice, liveValue: toNumber(a.amount) * livePrice }
  })

  const balance = toNumber(data?.balance)
  const futuresBalance = toNumber(futures?.balance)
  const assetValue = liveAssets.reduce((sum, a) => sum + a.liveValue, 0)
  // Net worth = spot cash + crypto + trading (futures). Excluding futures made an
  // internal spot->futures transfer look like a loss and the breakdown below not
  // add up to the headline; include it so the total matches its own parts.
  const equity = balance + assetValue + futuresBalance

  const pieData = liveAssets
    .map((a) => ({ symbol: a.symbol.toUpperCase(), value: a.liveValue }))
    .filter((d) => d.value > 0)

  // Convert targets = any market coin (not just ones already held), minus the
  // asset being converted from. Falls back to held assets if the market list
  // hasn't loaded yet so the dropdown is never empty.
  const convertTargets = (coins?.length ? coins : assets.map((a) => ({ id: a.coin_id, symbol: a.symbol, name: a.symbol.toUpperCase() })))
    .filter((c) => c.id !== activeAsset?.coin_id)

  const close = () => {
    setModal(null)
    setAmount('')
    setActiveAsset(null)
    setConvertTo('')
    setPreview(null)
  }

  const runDeposit = async () => {
    try {
      await deposit.mutateAsync({ amount })
      toast.success('Deposit successful')
      close()
    } catch (e) {
      toast.error('Deposit failed', { description: (e as Error).message })
    }
  }
  const runWithdraw = async () => {
    try {
      await withdraw.mutateAsync({ amount })
      toast.success('Withdrawal successful')
      close()
    } catch (e) {
      toast.error('Withdrawal failed', { description: (e as Error).message })
    }
  }
  const runSell = async () => {
    if (!activeAsset) return
    try {
      await sell.mutateAsync({ coin_id: activeAsset.coin_id, amount, price: activeAsset.live_price })
      toast.success('Sold', { description: `${activeAsset.symbol.toUpperCase()} position reduced` })
      close()
    } catch (e) {
      toast.error('Sell failed', { description: (e as Error).message })
    }
  }
  const loadPreview = async () => {
    if (!activeAsset || !convertTo || !amount) return
    try {
      const res = await apiGet<{ to_amount: string; to_symbol: string }>(
        `/markets/convert-preview/?from=${activeAsset.coin_id}&to=${convertTo}&amount=${amount}`,
      )
      setPreview(res)
    } catch (e) {
      toast.error('Preview failed', { description: (e as Error).message })
    }
  }
  const runConvert = async () => {
    if (!activeAsset || !convertTo) return
    try {
      const toSymbol = convertTargets.find((c) => c.id === convertTo)?.symbol
      await convert.mutateAsync({ from_coin: activeAsset.coin_id, to_coin: convertTo, amount, to_symbol: toSymbol })
      toast.success('Conversion complete')
      close()
    } catch (e) {
      toast.error('Conversion failed', { description: (e as Error).message })
    }
  }

  if (isLoading) return <WalletSkeleton />

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Wallet</h1>

      {/* overview */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel relative overflow-hidden p-6 lg:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-sm text-muted">Total equity</div>
              <div className="mt-1 text-4xl font-bold tracking-tight">
                <AnimatedNumber value={equity} format={{ style: 'currency', currency: 'USD' }} />
              </div>
              <div className="mt-4 flex flex-wrap gap-6 text-sm">
                <div>
                  <div className="text-faint">Cash</div>
                  <div className="font-num font-semibold tabular-nums">{formatUsd(balance)}</div>
                </div>
                <div>
                  <div className="text-faint">Crypto</div>
                  <div className="font-num font-semibold tabular-nums">{formatUsd(assetValue)}</div>
                </div>
                <div>
                  <div className="text-faint">Trading (Futures)</div>
                  <div className="font-num font-semibold tabular-nums">{formatUsd(futuresBalance)}</div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setModal('deposit')}>
                  <ArrowDownToLine /> Deposit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setModal('withdraw')}>
                  <ArrowUpFromLine /> Withdraw
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
                  <ArrowRightLeft /> Transfer
                </Button>
              </div>
            </div>

            {pieData.length > 0 && (
              // Kill Recharts' default SVG focus outlines (the box around the
              // chart + the arc rings on a clicked slice). The allocation is also
              // shown as a text legend, so the chart itself needn't be focusable.
              <div className="relative grid place-items-center [&_*:focus]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="symbol" innerRadius={56} outerRadius={82} paddingAngle={2} stroke="none" rootTabIndex={-1}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute text-center">
                  <div className="text-xs text-faint">Holdings</div>
                  <div className="font-num text-lg font-semibold">{pieData.length}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* allocation legend */}
        <div className="panel p-6">
          <div className="mb-3 text-sm font-semibold text-muted">Allocation</div>
          {pieData.length === 0 ? (
            <p className="text-sm text-faint">No assets yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {pieData
                .sort((a, b) => b.value - a.value)
                .map((d, i) => (
                  <li key={d.symbol} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {d.symbol}
                    </span>
                    <span className="font-num tabular-nums text-muted">
                      {((d.value / (assetValue || 1)) * 100).toFixed(1)}%
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>

      {/* assets */}
      <h2 className="mb-3 mt-8 text-lg font-semibold">Your assets</h2>
      {assets.length === 0 ? (
        <div className="panel grid place-items-center py-16 text-center">
          <p className="text-muted">You don’t hold any assets yet.</p>
          <Button asChild variant="outline" className="mt-3">
            <a href="/markets">Browse markets</a>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface-2 text-xs uppercase tracking-wide text-faint">
                <tr>
                  <th className="py-3 pl-4 text-left font-medium">Asset</th>
                  <th className="py-3 text-right font-medium">Amount</th>
                  <th className="py-3 text-right font-medium">Avg price</th>
                  <th className="py-3 pr-4 text-right font-medium">Value</th>
                  <th className="py-3 pr-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {liveAssets.map((a) => (
                  <tr key={a.coin_id} className="border-t border-border hover:bg-surface-1">
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-2">
                        <CoinIcon symbol={a.symbol} size={32} />
                        <span className="font-semibold">{a.symbol.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-num tabular-nums">{formatToken(a.amount)}</td>
                    <td className="py-3 text-right font-num tabular-nums text-muted">${formatToken(a.avg_price, 4)}</td>
                    <td className="py-3 pr-4 text-right font-num font-semibold tabular-nums">
                      <AnimatedNumber value={a.liveValue} format={{ style: 'currency', currency: 'USD' }} />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setActiveAsset(a)
                            setModal('sell')
                          }}
                        >
                          <TrendingDown /> Sell
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setActiveAsset(a)
                            setModal('convert')
                          }}
                        >
                          <Repeat /> Convert
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* deposit / withdraw */}
      <Dialog open={modal === 'deposit' || modal === 'withdraw'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal === 'deposit' ? 'Deposit funds' : 'Withdraw funds'}</DialogTitle>
            <DialogDescription>Cash balance: {formatUsd(balance)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dw">Amount (USD)</Label>
            <Input id="dw" type="number" prefix="$" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={modal === 'deposit' ? runDeposit : runWithdraw}
              disabled={deposit.isPending || withdraw.isPending}
            >
              {(deposit.isPending || withdraw.isPending) && <Loader2 className="animate-spin" />}
              Confirm {modal === 'deposit' ? 'deposit' : 'withdrawal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* sell */}
      <Dialog open={modal === 'sell'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell {activeAsset?.symbol.toUpperCase()}</DialogTitle>
            <DialogDescription>
              Holding {activeAsset && formatToken(activeAsset.amount)} {activeAsset?.symbol.toUpperCase()} · $
              {activeAsset && formatToken(activeAsset.live_price, 4)} each
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sell">Amount ({activeAsset?.symbol.toUpperCase()})</Label>
            <Input id="sell" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button
              onClick={() => activeAsset && setAmount(activeAsset.amount)}
              className="text-xs text-accent hover:underline"
            >
              Sell max
            </button>
          </div>
          <DialogFooter>
            <Button variant="destructive" className="w-full" onClick={runSell} disabled={sell.isPending}>
              {sell.isPending && <Loader2 className="animate-spin" />} Confirm sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* convert */}
      <Dialog open={modal === 'convert'} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert {activeAsset?.symbol.toUpperCase()}</DialogTitle>
            <DialogDescription>Swap one holding for another at live prices.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>To asset</Label>
              <Select
                value={convertTo}
                onValueChange={(v) => {
                  setConvertTo(v)
                  setPreview(null)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {convertTargets.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <CoinIcon symbol={c.symbol} src={(c as { image?: string }).image} size={18} />
                        {c.symbol.toUpperCase()} <span className="text-faint">· {c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cv">Amount ({activeAsset?.symbol.toUpperCase()})</Label>
              <Input
                id="cv"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setPreview(null)
                }}
              />
            </div>
            {amount && convertTo && (
              <Button variant="secondary" size="sm" onClick={loadPreview}>
                Preview conversion
              </Button>
            )}
            {preview && (
              <p className="rounded-md bg-surface-3 px-3 py-2 text-sm">
                ≈ <span className="font-num font-semibold">{formatToken(toNumber(preview.to_amount))}</span>{' '}
                {preview.to_symbol.toUpperCase()}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={runConvert} disabled={convert.isPending || !convertTo}>
              {convert.isPending && <Loader2 className="animate-spin" />} Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} futuresBalance={toNumber(futures?.balance)} />
    </div>
  )
}

function WalletSkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-4 py-8 sm:px-6">
      <Skeleton className="h-9 w-40" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-xl lg:col-span-2" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
