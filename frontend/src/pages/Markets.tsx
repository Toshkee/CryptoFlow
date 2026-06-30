import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star } from 'lucide-react'
import { useTop100 } from '@/hooks/queries'
import type { Coin } from '@/types'
import { Sparkline } from '@/components/charts/Sparkline'
import { ChangePill } from '@/components/live/ChangePill'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCompact, formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

const CATEGORY_RULES: Record<string, string[]> = {
  L1: ['bitcoin', 'ethereum', 'solana', 'avalanche-2', 'cardano', 'near'],
  L2: ['arbitrum', 'optimism', 'immutable', 'base', 'mantle'],
  DeFi: ['uniswap', 'aave', 'curve-dao-token', 'maker'],
  AI: ['fetch-ai', 'singularitynet', 'render-token'],
  Meme: ['dogecoin', 'shiba-inu', 'pepe', 'bonk'],
  Gaming: ['gala', 'axie-infinity', 'the-sandbox'],
  Stablecoins: ['tether', 'usd-coin', 'dai'],
}
const CATEGORIES = ['all', 'favorites', ...Object.keys(CATEGORY_RULES)]

function categoryOf(id: string): string {
  for (const cat in CATEGORY_RULES) if (CATEGORY_RULES[cat].includes(id)) return cat
  return 'Other'
}

type SortKey = 'market_cap' | 'price_desc' | 'price_asc' | 'change_desc' | 'change_asc' | 'alpha'
const PER_PAGE = 25

export default function Markets() {
  const { data: coins, isLoading, isError } = useTop100()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<SortKey>('market_cap')
  const [page, setPage] = useState(1)
  const [favorites, setFavorites] = useState<string[]>(
    () => JSON.parse(localStorage.getItem('favorites') || '[]') as string[],
  )

  const toggleFav = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
      localStorage.setItem('favorites', JSON.stringify(next))
      return next
    })
  }

  const filtered = useMemo(() => {
    let rows = (coins ?? []) as Coin[]
    if (category === 'favorites') rows = rows.filter((c) => favorites.includes(c.id))
    else if (category !== 'all') rows = rows.filter((c) => categoryOf(c.id) === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((c) => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
    }
    const sorted = [...rows].sort((a, b) => {
      switch (sort) {
        case 'price_asc': return a.current_price - b.current_price
        case 'price_desc': return b.current_price - a.current_price
        case 'change_asc': return (a.price_change_percentage_24h ?? 0) - (b.price_change_percentage_24h ?? 0)
        case 'change_desc': return (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0)
        case 'alpha': return a.name.localeCompare(b.name)
        default: return b.market_cap - a.market_cap
      }
    })
    return sorted
  }, [coins, category, search, sort, favorites])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, pageCount)
  const paginated = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
        <p className="mt-1 text-muted">Live prices for the top 100 crypto assets by market cap.</p>
      </div>

      {/* controls */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c)
                setPage(1)
              }}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                category === c ? 'bg-accent text-on-accent' : 'bg-surface-2 text-muted hover:text-text',
              )}
            >
              {c === 'favorites' ? '★ Favorites' : c}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            prefix={<Search className="size-4" />}
            placeholder="Search asset…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full lg:w-64"
          />
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-40 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="market_cap">Market cap</SelectItem>
              <SelectItem value="price_desc">Price: high → low</SelectItem>
              <SelectItem value="price_asc">Price: low → high</SelectItem>
              <SelectItem value="change_desc">24h: gainers</SelectItem>
              <SelectItem value="change_asc">24h: losers</SelectItem>
              <SelectItem value="alpha">Name A → Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-surface-2 text-xs uppercase tracking-wide text-faint">
              <tr>
                <th className="w-10 py-3 pl-4 text-left font-medium">#</th>
                <th className="py-3 text-left font-medium">Asset</th>
                <th className="py-3 pr-4 text-right font-medium">Price</th>
                <th className="py-3 pr-4 text-right font-medium">24h</th>
                <th className="hidden py-3 pr-4 text-right font-medium md:table-cell">7d</th>
                <th className="hidden py-3 pr-4 text-right font-medium lg:table-cell">Market cap</th>
                <th className="hidden py-3 pr-4 text-right font-medium xl:table-cell">Volume (24h)</th>
                <th className="w-10 py-3 pr-4" />
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td colSpan={8} className="p-2">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))}

              {isError && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    Couldn’t load market data. Please try again shortly.
                  </td>
                </tr>
              )}

              {!isLoading &&
                paginated.map((coin, i) => (
                  <tr
                    key={coin.id}
                    onClick={() => navigate(`/coin/${coin.id}`)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-surface-1"
                  >
                    <td className="py-3 pl-4 font-num text-faint">{(safePage - 1) * PER_PAGE + i + 1}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <img src={coin.image} alt="" className="size-7 rounded-full" loading="lazy" />
                        <div>
                          <div className="font-semibold">{coin.symbol.toUpperCase()}</div>
                          <div className="text-xs text-faint">{coin.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-num tabular-nums">${formatPrice(coin.current_price)}</td>
                    <td className="py-3 pr-4 text-right">
                      <ChangePill value={coin.price_change_percentage_24h} variant="bare" className="justify-end" />
                    </td>
                    <td className="hidden py-3 pr-4 md:table-cell">
                      <div className="flex justify-end">
                        <Sparkline data={coin.sparkline_in_7d?.price} />
                      </div>
                    </td>
                    <td className="hidden py-3 pr-4 text-right font-num tabular-nums text-muted lg:table-cell">
                      {formatCompact(coin.market_cap)}
                    </td>
                    <td className="hidden py-3 pr-4 text-right font-num tabular-nums text-muted xl:table-cell">
                      {formatCompact(coin.total_volume)}
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFav(coin.id)
                        }}
                        className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-surface-2"
                        aria-label={favorites.includes(coin.id) ? 'Remove favorite' : 'Add favorite'}
                      >
                        <Star className={cn('size-4', favorites.includes(coin.id) && 'fill-accent text-accent')} />
                      </button>
                    </td>
                  </tr>
                ))}

              {!isLoading && !isError && paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted">
                    No assets match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* pagination */}
      {!isLoading && filtered.length > PER_PAGE && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted">
            Page <span className="font-num text-text">{safePage}</span> of{' '}
            <span className="font-num text-text">{pageCount}</span>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={safePage >= pageCount} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
