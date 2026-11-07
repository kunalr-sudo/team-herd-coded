import { STATE_COLORS } from '../canvas/coords'
import { useSim } from '../../store/useSimulationStore'

export default function CowLegend() {
  const xray = useSim((s) => s.xray)
  const totals = useSim((s) => s.bundle.current.frames[s.hour].totals)
  const items: [string, string, number | null][] = [
    [STATE_COLORS.healthy, 'Healthy', xray ? totals.healthy + totals.recovered : totals.healthy + totals.recovered + totals.quiet],
    [STATE_COLORS.quiet, xray ? 'Quietly infected' : 'Quietly infected (X-Ray only)', xray ? totals.quiet : null],
    [STATE_COLORS.sick, 'Fever / visibly sick', totals.sick],
    [STATE_COLORS.protected, 'Treated & protected', totals.protectedCount],
  ]
  return (
    <div className="pointer-events-none absolute bottom-[96px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 rounded-full border border-slate-700/60 bg-slate-950/80 px-4 py-1.5 text-[12px] text-slate-300">
      {items.map(([c, label, n]) => (
        <span key={label} className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
          {label}
          {n !== null && <span className="font-mono font-bold text-slate-100">{n}</span>}
        </span>
      ))}
      {totals.dead > 0 && (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATE_COLORS.dead }} />
          Dead <span className="font-mono font-bold text-slate-100">{totals.dead}</span>
        </span>
      )}
    </div>
  )
}
