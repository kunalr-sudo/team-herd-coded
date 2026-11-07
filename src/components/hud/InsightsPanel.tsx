import { BrainCircuit, CheckCircle2, ChevronRight, Dna, Maximize2, Sparkles, Thermometer } from 'lucide-react'
import type { ReactNode } from 'react'
import { advise, usd } from '../../sim/advisor'
import { useSim } from '../../store/useSimulationStore'
import ProjectionChart from './ProjectionChart'
import { PLAN_NAME, chartSeries, comparedPlan } from './projectionData'

const MODE_STYLE = {
  monitoring: { label: 'Monitoring', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  alert: { label: 'Action needed', cls: 'bg-red-500/15 text-red-300 border-red-500/50 animate-pulse' },
  scheduled: { label: 'Plan scheduled', cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' },
  acting: { label: 'Protocol running', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
}

function Row({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{title}</div>
        <div className="text-[12.5px] leading-snug text-slate-200">{children}</div>
      </div>
    </div>
  )
}

export default function InsightsPanel() {
  const open = useSim((s) => s.insightsOpen)
  const toggle = useSim((s) => s.toggleInsights)
  const bundle = useSim((s) => s.bundle)
  const kind = useSim((s) => s.planKind)
  const hour = useSim((s) => s.hour)
  const fault = useSim((s) => s.crisis.fanBFault)
  const actionHour = useSim((s) => s.plan.actionHour)
  const changedAt = useSim((s) => s.changedAt)
  const apply = useSim((s) => s.applyRecommendation)
  const openProjection = useSim((s) => s.setProjectionOpen)

  if (!open)
    return (
      <button
        type="button"
        onClick={toggle}
        className="panel pointer-events-auto absolute right-3 top-[156px] z-10 flex items-center gap-2 px-3 py-2 text-[12.5px] font-semibold text-slate-200 hover:text-white"
      >
        <BrainCircuit size={16} className="text-cyan-300" /> BarnTwin AI & projection
      </button>
    )

  const advice = advise(bundle, kind, hour, fault)
  const mode = MODE_STYLE[advice.mode]
  const plan = comparedPlan(bundle, kind)
  const b = bundle.doNothing.summary
  const p = plan.summary
  const saved = b.cost.total - p.cost.total

  return (
    <div className="panel pointer-events-auto absolute right-3 top-[156px] bottom-[96px] z-10 flex w-[318px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-700/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <BrainCircuit size={17} className="text-cyan-300" />
          <span className="text-[13px] font-bold text-slate-100">BarnTwin AI</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${mode.cls}`}>{mode.label}</span>
        </div>
        <button type="button" onClick={toggle} className="text-slate-400 hover:text-white" aria-label="Collapse panel" title="Collapse">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        <Row icon={<Thermometer size={15} />} title="1 · Senses the barn">
          {advice.sensing}
        </Row>
        <Row icon={<Dna size={15} />} title="2 · Predicts disease">
          {advice.predicting}
        </Row>
        {advice.actions.length > 0 && (
          <Row icon={<Sparkles size={15} />} title="3 · Recommends">
            <ul className="mt-0.5 space-y-0.5">
              {advice.actions.map((a) => (
                <li key={a} className="flex gap-1.5 text-[12px]">
                  <CheckCircle2 size={13} className={`mt-0.5 shrink-0 ${kind === 'smart' ? 'text-emerald-400' : 'text-slate-500'}`} />
                  {a}
                </li>
              ))}
            </ul>
            <div className="mt-1 text-[11.5px] font-semibold text-emerald-300">{advice.payoff}</div>
            {kind === 'smart' ? (
              <div className="mt-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11.5px] text-emerald-200">
                ✓ Applied — BarnTwin acts at Hour {actionHour}
              </div>
            ) : (
              <button
                type="button"
                onClick={apply}
                className="mt-2 w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-[12.5px] font-bold text-slate-950 shadow-[0_0_16px_rgba(16,185,129,0.4)] hover:bg-emerald-400"
              >
                Apply BarnTwin recommendation
              </button>
            )}
          </Row>
        )}

        <div key={changedAt} className="animate-[flash_0.9s_ease-out] rounded-lg border border-slate-700/60 bg-slate-900/50 p-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">7-day projection</div>
            <div className="text-[10px] text-slate-500">vs doing nothing</div>
          </div>
          <div className="mt-0.5 text-[11.5px] text-slate-400">{PLAN_NAME[kind]}</div>
          <div className={`text-[24px] font-extrabold leading-tight ${saved >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {saved >= 0 ? `${usd(saved)} saved` : `${usd(-saved)} extra loss`}
          </div>
          <div className="text-[12px] text-slate-300">
            Sick {b.clinicalCases} → <b>{p.clinicalCases}</b> · Deaths {b.deaths} → <b>{p.deaths}</b>
          </div>
          <div className="mt-1">
            <ProjectionChart series={chartSeries(bundle, kind)} hour={hour} actionHour={actionHour} height={70} axes={false} />
          </div>
          <button
            type="button"
            onClick={() => openProjection(true)}
            className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-600/70 px-2 py-1 text-[12px] font-semibold text-slate-200 hover:border-cyan-400 hover:text-white"
          >
            <Maximize2 size={13} /> Open full projection
          </button>
          <div className="mt-1 text-center text-[10px] text-slate-500">
            Recomputed in {bundle.computeMs.toFixed(1)} ms · playback retraces this path
          </div>
        </div>
      </div>
    </div>
  )
}
