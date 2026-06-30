import { useMemo, useState } from 'react'
import { ArrowRightLeft, ArrowDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSpotWallet, useTransferFunds } from '@/hooks/queries'
import { toNumber, formatUsd } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Direction = 'to_futures' | 'to_spot'

/**
 * Move cash between the Spot wallet (cash) and the Futures/trading balance.
 * The server settles both wallets atomically under a row lock.
 */
export function TransferDialog({
  open,
  onOpenChange,
  futuresBalance,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  futuresBalance: number
}) {
  const { data: spot } = useSpotWallet()
  const transfer = useTransferFunds()
  const [direction, setDirection] = useState<Direction>('to_futures')
  const [amount, setAmount] = useState('')

  const spotBalance = toNumber(spot?.balance)
  const from = direction === 'to_futures' ? spotBalance : futuresBalance
  const fromLabel = direction === 'to_futures' ? 'Spot' : 'Futures'
  const toLabel = direction === 'to_futures' ? 'Futures' : 'Spot'

  const amt = Number(amount)
  const invalid = !amt || amt <= 0 || amt > from

  const submit = async () => {
    if (invalid) return
    try {
      const res = await transfer.mutateAsync({ direction, amount })
      toast.success('Transfer complete', {
        description: `${formatUsd(toNumber(res.amount))} → ${toLabel} · Futures ${formatUsd(toNumber(res.futures_balance))}`,
      })
      setAmount('')
      onOpenChange(false)
    } catch (e) {
      toast.error('Transfer failed', { description: (e as Error).message })
    }
  }

  // Reset to a clean state whenever the dialog opens.
  const flip = () => setDirection((d) => (d === 'to_futures' ? 'to_spot' : 'to_futures'))

  const rows = useMemo(
    () => [
      { label: `${fromLabel} (from)`, value: from },
      { label: `${toLabel} (to)`, value: direction === 'to_futures' ? futuresBalance : spotBalance },
    ],
    [fromLabel, toLabel, from, direction, futuresBalance, spotBalance],
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setAmount(''); onOpenChange(o) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-accent" /> Transfer funds
          </DialogTitle>
          <DialogDescription>Move cash between your Spot wallet and Futures trading balance.</DialogDescription>
        </DialogHeader>

        {/* from → to visual with a flip button */}
        <div className="relative space-y-2">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5"
            >
              <span className="text-xs uppercase tracking-wide text-muted">{r.label}</span>
              <span className="font-num tabular-nums text-sm font-semibold">{formatUsd(r.value)}</span>
              {i === 0 && (
                <button
                  type="button"
                  onClick={flip}
                  aria-label="Swap direction"
                  className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-surface-3 p-1.5 text-muted transition-colors hover:text-accent"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted">
            <label htmlFor="transfer-amt" className="font-medium uppercase tracking-wide">
              Amount
            </label>
            <button
              type="button"
              className="text-accent hover:underline"
              onClick={() => setAmount(from > 0 ? (Math.floor(from * 100) / 100).toFixed(2) : '')}
            >
              Max {formatUsd(from)}
            </button>
          </div>
          <Input
            id="transfer-amt"
            type="number"
            inputMode="decimal"
            prefix="$"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {amt > from && <p className="text-xs text-down">Exceeds {fromLabel} balance.</p>}
        </div>

        <DialogFooter>
          <Button className={cn('w-full')} onClick={submit} disabled={invalid || transfer.isPending}>
            {transfer.isPending && <Loader2 className="animate-spin" />}
            Transfer to {toLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
