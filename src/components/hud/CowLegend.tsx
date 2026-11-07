import { STATE_COLORS } from '../canvas/coords'
import { useSim } from '../../store/useSimulationStore'

export default function CowLegend() {
  const xray = useSim((s) => s.xray)
  const totals = useSim((s) => s.bundle.current.frames[s.hour].totals)
  const items: [string, string, number | null][] = [
    ['linear-gradient(135deg,#f8fafc 50%,#111827 50%)', 'Healthy', xray ? totals.healthy + totals.recovered : totals.healthy + totals.recovered + totals.quiet],
    [STATE_COLORS.quiet, xray ? 'Quietly infected' : 'Quietly infected (see X-Ray)', xray ? totals.quiet : null],
    [STATE_COLORS.sick, 'Fever / visibly sick', totals.sick],
    [STATE_COLORS.protected, 'Treated & protected', totals.protectedCount],
  ]
  return (
    <div className="panel pointer-events-none absolute bottom-[110px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 !rounded-full px-4 py-2 text-[12.5px] text-slate-300">
      {items.map(([c, label, n]) => (
        <span key={label} className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white/20" style={{ background: c, boxShadow: c.startsWith('#') ? `0 0 8px ${c}` : undefined }} />
          {label}
          {n !== null && <span className="font-semibold tabular-nums text-white">{n}</span>}
        </span>
      ))}
      {totals.dead > 0 && (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white/20" style={{ background: STATE_COLORS.dead }} />
          Dead <span className="font-semibold tabular-nums text-white">{totals.dead}</span>
        </span>
      )}
    </div>
  )
}
