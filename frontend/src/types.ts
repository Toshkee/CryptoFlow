// Shared API types. Loose where the upstream (CoinGecko) is loose.

export interface User {
  id: number
  username: string
  email: string
  profile_picture?: string | null
}

export interface FuturesWallet {
  balance: string
}

export type PositionSide = 'LONG' | 'SHORT'

export interface Position {
  id: number
  symbol: string
  side: PositionSide
  entry_price: string
  amount: string
  leverage: number
  initial_margin: string
  liquidation_price: string
}

export interface Coin {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap: number
  market_cap_rank?: number
  total_volume: number
  high_24h?: number
  low_24h?: number
  price_change_percentage_24h: number
  circulating_supply?: number
  max_supply?: number | null
  sparkline_in_7d?: { price: number[] }
  curated_category?: string
}

export interface SpotAsset {
  coin_id: string
  symbol: string
  amount: string
  avg_price: string
  live_price: string
  usd_value: string
}

export interface SpotWallet {
  balance: string
  total_asset_value: string
  assets: SpotAsset[]
}

export interface CoinDetail {
  info: {
    id: string
    symbol: string
    name: string
    image: { thumb?: string; small?: string; large: string }
    description: { en: string }
    market_data: {
      current_price: { usd: number }
      price_change_percentage_24h: number
      price_change_percentage_7d?: number
      market_cap: { usd: number }
      total_volume: { usd: number }
      high_24h?: { usd: number }
      low_24h?: { usd: number }
      circulating_supply: number
      max_supply: number | null
      ath?: { usd: number }
    }
  }
  chart: { prices: [number, number][] }
}
