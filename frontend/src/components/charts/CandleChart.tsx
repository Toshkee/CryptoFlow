import { useEffect, useRef } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts'

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

const CHART_THEME = {
  bg: '#111317',
  text: '#8b919a',
  grid: 'rgba(255,255,255,0.035)',
  border: '#24272e',
  up: '#2ebd85',
  down: '#f6465d',
}

/**
 * Themed candlestick chart. Created once; `setData` on the full series and
 * `update` on the live bar so the chart never tears down on each tick.
 */
export function CandleChart({
  data,
  liveCandle,
  height = 440,
}: {
  data: Candle[] | undefined
  liveCandle: Candle | null
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: CHART_THEME.bg },
        textColor: CHART_THEME.text,
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_THEME.grid },
        horzLines: { color: CHART_THEME.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: CHART_THEME.border },
      timeScale: { borderColor: CHART_THEME.border, timeVisible: true, secondsVisible: false },
    })

    const series = chart.addCandlestickSeries({
      upColor: CHART_THEME.up,
      downColor: CHART_THEME.down,
      borderVisible: false,
      wickUpColor: CHART_THEME.up,
      wickDownColor: CHART_THEME.down,
    })

    chartRef.current = chart
    seriesRef.current = series

    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (seriesRef.current && data && data.length) {
      seriesRef.current.setData(data as never)
      chartRef.current?.timeScale().fitContent()
    }
  }, [data])

  useEffect(() => {
    if (seriesRef.current && liveCandle) {
      seriesRef.current.update(liveCandle as never)
    }
  }, [liveCandle])

  return <div ref={containerRef} style={{ height }} className="w-full" />
}
