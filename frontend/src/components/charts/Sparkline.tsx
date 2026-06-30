import { useId } from 'react'

/** Tiny inline SVG sparkline with a soft area fill. */
export function Sparkline({
  data,
  width = 120,
  height = 36,
  className,
}: {
  data: number[] | undefined
  width?: number
  height?: number
  className?: string
}) {
  const id = useId()
  if (!data || data.length < 2) {
    return <div className="text-xs text-faint">—</div>
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const up = data[data.length - 1] >= data[0]
  const color = up ? '#2ebd85' : '#f6465d'

  const pts = data.map((p, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((p - min) / range) * (height - 4) - 2
    return [x, y] as const
  })
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,${height} ${line} ${width},${height}`

  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#spark-${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
