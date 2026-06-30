import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode, type IChartApi, type ISeriesApi } from 'lightweight-charts'

export interface AreaPoint {
  time: number
  value: number
}

/** Smooth area chart for the coin-detail 7-day view. */
export function PriceAreaChart({ data, up, height = 300 }: { data: AreaPoint[]; up: boolean; height?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8b919a',
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 11,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(255,255,255,0.035)' } },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      handleScroll: false,
      handleScale: false,
    })
    const color = up ? '#2ebd85' : '#f6465d'
    const series = chart.addAreaSeries({
      lineColor: color,
      lineWidth: 2,
      topColor: up ? 'rgba(46,189,133,0.28)' : 'rgba(246,70,93,0.28)',
      bottomColor: 'rgba(0,0,0,0)',
      priceLineVisible: false,
      lastValueVisible: true,
    })
    chartRef.current = chart
    seriesRef.current = series
    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [up])

  useEffect(() => {
    if (seriesRef.current && data.length) {
      seriesRef.current.setData(data as never)
      chartRef.current?.timeScale().fitContent()
    }
  }, [data])

  return <div ref={containerRef} style={{ height }} className="w-full" />
}
