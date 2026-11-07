import { HOURS } from '../../sim/constants'

export interface ChartSeries {
  data: number[]
  color: string
  dash?: string
  width?: number
  label: string
}

/**
 * Projection chart. The full 7-day path is drawn immediately; the part already played is
 * solid and the future is faded, so playback visibly retraces the projected path.
 */
export default function ProjectionChart({
  series,
  hour,
  actionHour,
  width = 300,
  height = 120,
  axes = true,
}: {
  series: ChartSeries[]
  hour: number
  actionHour: number
  width?: number
  height?: number
  axes?: boolean
}) {
  const pad = axes ? { l: 28, r: 8, t: 8, b: 18 } : { l: 2, r: 2, t: 4, b: 4 }
  const maxY = Math.max(10, ...series.flatMap((s) => s.data))
  const x = (h: number) => pad.l + (h / HOURS) * (width - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - v / maxY) * (height - pad.t - pad.b)
  const path = (d: number[], from: number, to: number) =>
    d
      .slice(from, to + 1)
      .map((v, k) => `${k === 0 ? 'M' : 'L'}${x(from + k).toFixed(1)},${y(v).toFixed(1)}`)
      .join('')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {axes &&
        [0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={width - pad.r} y1={y(maxY * f)} y2={y(maxY * f)} stroke="#1e293b" />
            <text x={pad.l - 4} y={y(maxY * f) + 3} textAnchor="end" fontSize="9" fill="#64748b">
              {Math.round(maxY * f)}
            </text>
          </g>
        ))}
      {axes &&
        [0, 24, 48, 72, 96, 120, 144, 168].map((h) => (
          <text key={h} x={x(h)} y={height - 5} textAnchor="middle" fontSize="9" fill="#64748b">
            {h === 0 ? 'Mon' : `${h}h`}
          </text>
        ))}
      <line x1={x(actionHour)} x2={x(actionHour)} y1={pad.t} y2={height - pad.b} stroke="#22d3ee" strokeDasharray="2 3" opacity={0.7} />
      {series.map((s) => (
        <g key={s.label}>
          <path d={path(s.data, 0, HOURS)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeDasharray={s.dash} opacity={0.32} />
          <path d={path(s.data, 0, hour)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2} strokeDasharray={s.dash} />
          <circle cx={x(hour)} cy={y(s.data[hour])} r={3} fill={s.color} />
        </g>
      ))}
      <line x1={x(hour)} x2={x(hour)} y1={pad.t} y2={height - pad.b} stroke="#e2e8f0" opacity={0.65} />
    </svg>
  )
}
