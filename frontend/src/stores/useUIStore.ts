import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TradeInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
export type OrderSide = 'BUY' | 'SELL'

interface UIState {
  symbol: string
  interval: TradeInterval
  leverage: number
  side: OrderSide
  setSymbol: (s: string) => void
  setInterval: (i: TradeInterval) => void
  setLeverage: (l: number) => void
  setSide: (s: OrderSide) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      symbol: 'BTCUSDT',
      interval: '15m',
      leverage: 20,
      side: 'BUY',
      setSymbol: (symbol) => set({ symbol }),
      setInterval: (interval) => set({ interval }),
      setLeverage: (leverage) => set({ leverage }),
      setSide: (side) => set({ side }),
    }),
    {
      name: 'cryptoflow-ui',
      partialize: (s) => ({ symbol: s.symbol, interval: s.interval, leverage: s.leverage }),
    },
  ),
)

/** The perpetual markets we expose on the Trade screen. */
export const MARKETS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'ATOMUSDT', 'NEARUSDT', 'LTCUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT',
] as const
