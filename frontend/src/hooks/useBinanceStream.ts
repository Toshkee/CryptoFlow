import { useEffect, useRef, useState } from 'react'
import { WebSocket as ReconnectingWebSocket } from 'partysocket'
import type { ConnStatus } from '@/components/live/LiveDot'

export interface OrderBookLevel {
  price: number
  qty: number
}
export interface OrderBook {
  asks: OrderBookLevel[]
  bids: OrderBookLevel[]
}
export interface LiveCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
}
export interface Trade {
  id: number
  price: number
  qty: number
  time: number // ms epoch
  side: 'buy' | 'sell' // aggressor: buy = long-side, sell = short-side
}

export interface StreamState {
  price: number | null
  orderbook: OrderBook
  candle: LiveCandle | null
  trades: Trade[]
  status: ConnStatus
}

const DEPTH = 12
const TRADES_MAX = 40

/**
 * Connects the browser directly to Binance SPOT streams for a symbol:
 * last price (@ticker), depth20 order book (100ms) and live klines.
 * Auto-reconnects with backoff (partysocket) and runs a staleness watchdog so
 * the UI flips to "reconnecting" instead of silently freezing.
 *
 * NOTE: we stream Binance *spot*, not USDⓈ-M futures (`fstream.binance.com`).
 * The futures streaming endpoints are geo-restricted in many regions (the
 * socket opens but no data is ever pushed), whereas spot streams are broadly
 * reachable. A perp's mark price tracks the spot index anyway, and the backend
 * settles against the same Binance spot price — so live and realized PnL agree.
 */
export function useBinanceStream(symbol: string, interval: string): StreamState {
  const [price, setPrice] = useState<number | null>(null)
  const [orderbook, setOrderbook] = useState<OrderBook>({ asks: [], bids: [] })
  const [candle, setCandle] = useState<LiveCandle | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [status, setStatus] = useState<ConnStatus>('connecting')
  const lastMsg = useRef(0)

  useEffect(() => {
    const lower = symbol.toLowerCase()
    const streams = [
      `${lower}@ticker`,
      `${lower}@depth20@100ms`,
      `${lower}@kline_${interval}`,
      `${lower}@aggTrade`,
    ].join('/')
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`

    setStatus('connecting')
    setPrice(null)
    setOrderbook({ asks: [], bids: [] })
    setCandle(null)
    setTrades([])

    const ws = new ReconnectingWebSocket(url, [], {
      minReconnectionDelay: 800,
      maxReconnectionDelay: 8000,
      reconnectionDelayGrowFactor: 1.6,
      connectionTimeout: 6000,
      maxRetries: Infinity,
    })

    const markLive = () => {
      lastMsg.current = Date.now()
      setStatus('live')
    }

    ws.addEventListener('open', markLive)
    ws.addEventListener('close', () => setStatus('connecting'))
    ws.addEventListener('error', () => setStatus('connecting'))
    ws.addEventListener('message', (ev: MessageEvent) => {
      markLive()
      let packet: { stream?: string; data?: any }
      try {
        packet = JSON.parse(ev.data)
      } catch {
        return
      }
      const { stream, data } = packet
      if (!stream || !data) return

      if (stream.includes('@ticker')) {
        // spot 24h ticker: `c` = last price
        if (data.c != null) setPrice(+data.c)
      } else if (stream.includes('@depth')) {
        // spot partial-depth uses `bids`/`asks`; futures used `b`/`a` — accept both.
        const asks = data.asks ?? data.a
        const bids = data.bids ?? data.b
        if (Array.isArray(asks) && Array.isArray(bids)) {
          setOrderbook({
            asks: asks.slice(0, DEPTH).map(([p, q]: [string, string]) => ({ price: +p, qty: +q })),
            bids: bids.slice(0, DEPTH).map(([p, q]: [string, string]) => ({ price: +p, qty: +q })),
          })
        }
      } else if (stream.includes('@kline')) {
        const k = data.k
        if (k) setCandle({ time: Math.floor(k.t / 1000), open: +k.o, high: +k.h, low: +k.l, close: +k.c })
      } else if (stream.includes('@aggTrade')) {
        // isBuyerMaker (`m`) true => the aggressor was the SELLER (short-side);
        // false => aggressor was the BUYER (long-side).
        const t: Trade = { id: data.a, price: +data.p, qty: +data.q, time: data.T, side: data.m ? 'sell' : 'buy' }
        if (Number.isFinite(t.price) && Number.isFinite(t.qty)) {
          setTrades((prev) => [t, ...prev].slice(0, TRADES_MAX))
        }
      }
    })

    const watchdog = window.setInterval(() => {
      if (lastMsg.current && Date.now() - lastMsg.current > 8000) setStatus('connecting')
    }, 3000)

    return () => {
      window.clearInterval(watchdog)
      ws.close()
    }
  }, [symbol, interval])

  return { price, orderbook, candle, trades, status }
}
