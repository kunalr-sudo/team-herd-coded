import { Play } from 'lucide-react'
import { usd } from '../../sim/advisor'
import { useSim } from '../../store/useSimulationStore'
import { PLAN_NAME, comparedPlan } from './projectionData'

/** Brief confirmation that the 7-day projection was recomputed after a control change. */
export default function ChangeToast() {
  const changedAt = useSim((s) => s.changedAt)
  const bundle = useSim((s) => s.bundle)
  const kind = useSim((s) => s.planKind)
  if (!changedAt) return null
  const saved = bundle.doNothing.summary.cost.total - comparedPlan(bundle, kind).summary.cost.total
  return (
    <div
      key={changedAt}
      className="pointer-events-none absolute bottom-[132px] left-1/2 z-30 flex -translate-x-1/2 animate-[toast_3s_ease-out_forwards] items-center gap-2 rounded-full border border-cyan-400/50 bg-slate-950/90 px-4 py-2 text-[13px] text-slate-100 shadow-xl"
    >
      <span className="h-2 w-2 rounded-full bg-cyan-400" />
      Projection updated in {bundle.computeMs.toFixed(1)} ms — {PLAN_NAME[kind]}:{' '}
      <b className={saved >= 0 ? 'text-emerald-300' : 'text-red-300'}>{saved >= 0 ? `${usd(saved)} saved` : `${usd(-saved)} extra loss`}</b>
      <span className="flex items-center gap-1 text-slate-400">
        · press <Play size={12} /> to watch it unfold
      </span>
    </div>
  )
}
