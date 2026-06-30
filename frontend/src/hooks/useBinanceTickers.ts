import { useEffect, useState } from 'react'
import { WebSocket as ReconnectingWebSocket } from 'partysocket'

export interface Ticker {
  price: number
  changePct: number
}

/**
 * Subscribes to Binance spot 24h ticker streams for a fixed set of symbols.
 * No API key required — powers the live price strips on Home / Trade headers.
 * Uses spot (`stream.binance.com`) rather than futures, which is geo-restricted
 * in many regions — see useBinanceStream for the full rationale.
 */
export function useBinanceTickers(symbols: string[]): Record<string, Ticker> {
  const [map, setMap] = useState<Record<string, Ticker>>({})
  const key = symbols.join(',')

  useEffect(() => {
    if (!symbols.length) return
    const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`).join('/')
    const ws = new ReconnectingWebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`, [], {
      minReconnectionDelay: 1000,
      maxReconnectionDelay: 10000,
    })
    ws.addEventListener('message', (ev: MessageEvent) => {
      try {
        const { data } = JSON.parse(ev.data)
        if (data?.s) {
          setMap((m) => ({ ...m, [data.s]: { price: +data.c, changePct: +data.P } }))
        }
      } catch {
        /* ignore */
      }
    })
    return () => ws.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return map
}
