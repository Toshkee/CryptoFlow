import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '@/lib/api'
import type { Coin, CoinDetail, FuturesWallet, Position, SpotWallet } from '@/types'

export const qk = {
  futuresWallet: ['futures', 'wallet'] as const,
  positions: ['futures', 'positions'] as const,
  top100: ['markets', 'top100'] as const,
  top8: ['markets', 'top8'] as const,
  coin: (id: string) => ['markets', 'coin', id] as const,
  spotWallet: ['markets', 'spotWallet'] as const,
}

/* ---------------- Futures ---------------- */

export function useFuturesWallet() {
  return useQuery({
    queryKey: qk.futuresWallet,
    queryFn: () => apiGet<FuturesWallet>('/futures/wallet/'),
    refetchInterval: 10_000,
  })
}

export function usePositions() {
  return useQuery({
    queryKey: qk.positions,
    queryFn: () => apiGet<Position[]>('/futures/positions/'),
    refetchInterval: 8_000,
  })
}

export function useOpenPosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { symbol: string; side: string; leverage: number; margin: string; price?: number | null }) =>
      apiPost('/futures/open/', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.futuresWallet })
      qc.invalidateQueries({ queryKey: qk.positions })
    },
  })
}

export function useClosePosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, price }: { id: number; price?: number | null }) =>
      apiPost<{ pnl: string; wallet_balance: string; closed_price: string }>(`/futures/close/${id}/`, { price }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.futuresWallet })
      qc.invalidateQueries({ queryKey: qk.positions })
    },
  })
}

export interface TransferResult {
  message: string
  direction: 'to_futures' | 'to_spot'
  amount: string
  futures_balance: string
  spot_balance: string
}

/** Move cash between the spot wallet and the futures (trading) wallet. */
export function useTransferFunds() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { direction: 'to_futures' | 'to_spot'; amount: string }) =>
      apiPost<TransferResult>('/futures/transfer/', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.futuresWallet })
      qc.invalidateQueries({ queryKey: qk.spotWallet })
    },
  })
}

/* ---------------- Markets (spot) ---------------- */

export function useTop100() {
  return useQuery({
    queryKey: qk.top100,
    queryFn: () => apiGet<Coin[]>('/markets/top100/'),
    staleTime: 45_000,
    refetchInterval: 60_000,
  })
}

export function useTop8() {
  return useQuery({
    queryKey: qk.top8,
    queryFn: () => apiGet<Coin[]>('/markets/top8/'),
    staleTime: 45_000,
  })
}

export function useCoinDetail(id: string | undefined) {
  return useQuery({
    queryKey: qk.coin(id ?? ''),
    queryFn: () => apiGet<CoinDetail>(`/markets/${id}/`),
    enabled: !!id,
  })
}

export function useSpotWallet() {
  return useQuery({
    queryKey: qk.spotWallet,
    queryFn: () => apiGet<SpotWallet>('/markets/wallet/'),
    // Reconcile amounts/avg-price periodically; live USD valuation is layered on
    // top client-side from the Binance spot stream (see Wallet page).
    refetchInterval: 15_000,
  })
}

export function useSpotMutation<TBody>(path: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TBody) => apiPost(path, body as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.spotWallet })
    },
  })
}
