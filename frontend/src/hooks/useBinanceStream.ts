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

export interface StreamState {
  price: number | null
  orderbook: OrderBook
  candle: LiveCandle | null
  status: ConnStatus
}

const DEPTH = 12

/**
 * Connects the browser directly to Binance futures streams for a symbol:
 * mark price (1s), depth20 order book (100ms) and live klines.
 * Auto-reconnects with backoff (partysocket) and runs a staleness watchdog so
 * the UI flips to "reconnecting" instead of silently freezing.
 */
export function useBinanceStream(symbol: string, interval: string): StreamState {
  const [price, setPrice] = useState<number | null>(null)
  const [orderbook, setOrderbook] = useState<OrderBook>({ asks: [], bids: [] })
  const [candle, setCandle] = useState<LiveCandle | null>(null)
  const [status, setStatus] = useState<ConnStatus>('connecting')
  const lastMsg = useRef(0)

  useEffect(() => {
    const lower = symbol.toLowerCase()
    const streams = [`${lower}@markPrice@1s`, `${lower}@depth20@100ms`, `${lower}@kline_${interval}`].join('/')
    const url = `wss://fstream.binance.com/stream?streams=${streams}`

    setStatus('connecting')
    setPrice(null)
    setOrderbook({ asks: [], bids: [] })
    setCandle(null)

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

      if (stream.includes('@markPrice')) {
        if (data.p != null) setPrice(+data.p)
      } else if (stream.includes('@depth')) {
        if (Array.isArray(data.a) && Array.isArray(data.b)) {
          setOrderbook({
            asks: data.a.slice(0, DEPTH).map(([p, q]: [string, string]) => ({ price: +p, qty: +q })),
            bids: data.b.slice(0, DEPTH).map(([p, q]: [string, string]) => ({ price: +p, qty: +q })),
          })
        }
      } else if (stream.includes('@kline')) {
        const k = data.k
        if (k) setCandle({ time: Math.floor(k.t / 1000), open: +k.o, high: +k.h, low: +k.l, close: +k.c })
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

  return { price, orderbook, candle, status }
}
