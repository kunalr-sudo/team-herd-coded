import { BrainCircuit, Check, ChevronRight, Dna, Maximize2, Sparkles, Thermometer } from 'lucide-react'
import { advise, usd } from '../../sim/advisor'
import { useSim } from '../../store/useSimulationStore'
import { IconTile, Row } from '../ui/controls'
import ProjectionChart from './ProjectionChart'
import { PLAN_NAME, chartSeries, comparedPlan } from './projectionData'

const MODE = {
  monitoring: { label: 'Monitoring', cls: 'bg-sky-400/15 text-sky-300' },
  alert: { label: 'Action needed', cls: 'bg-red-400/15 text-red-300' },
  scheduled: { label: 'Plan scheduled', cls: 'bg-cyan-400/15 text-cyan-300' },
  acting: { label: 'Plan running', cls: 'bg-emerald-400/15 text-emerald-300' },
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
      <button type="button" onClick={toggle} className="panel press pointer-events-auto absolute right-3 top-[140px] z-10 flex items-center gap-2 !rounded-full px-4 py-2.5 text-[13.5px] font-medium text-white">
        <BrainCircuit size={16} className="text-cyan-300" /> BarnTwin AI
      </button>
    )

  const advice = advise(bundle, kind, hour, fault)
  const mode = MODE[advice.mode]
  const plan = comparedPlan(bundle, kind)
  const b = bundle.doNothing.summary
  const p = plan.summary
  const saved = b.cost.total - p.cost.total

  return (
    <div className="panel pointer-events-auto absolute right-3 top-[140px] bottom-[108px] z-10 flex w-[340px] flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[17px] font-semibold tracking-tight text-white">BarnTwin AI</span>
          <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${mode.cls}`}>{mode.label}</span>
        </div>
        <button type="button" onClick={toggle} className="press grid h-7 w-7 place-items-center rounded-full bg-white/10 text-slate-300 hover:text-white" aria-label="Collapse panel" title="Collapse">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        <div className="grouped">
          <Row
            icon={
              <IconTile color="orange">
                <Thermometer size={16} />
              </IconTile>
            }
            title="Senses"
            subtitle={<span className="text-slate-300">{advice.sensing}</span>}
          />
          <Row
            icon={
              <IconTile color="purple">
                <Dna size={16} />
              </IconTile>
            }
            title="Predicts"
            subtitle={<span className="text-slate-300">{advice.predicting}</span>}
            divider={advice.actions.length > 0}
          />
          {advice.actions.length > 0 && (
            <Row
              icon={
                <IconTile color="green">
                  <Sparkles size={16} />
                </IconTile>
              }
              title="Recommends"
              divider={false}
            >
              <ul className="space-y-1.5 pl-[42px]">
                {advice.actions.map((a) => (
                  <li key={a} className="flex gap-2 text-[13px] leading-snug text-slate-300">
                    <Check size={14} className={`mt-0.5 shrink-0 ${kind === 'smart' ? 'text-emerald-400' : 'text-slate-600'}`} strokeWidth={3} />
                    {a}
                  </li>
                ))}
              </ul>
              <div className="mt-2.5 pl-[42px] text-[13px] font-medium text-emerald-300">{advice.payoff}</div>
              <div className="mt-3">
                {kind === 'smart' ? (
                  <div className="rounded-full bg-emerald-400/10 py-2 text-center text-[13px] font-medium text-emerald-200">Applied · acts at Hour {actionHour}</div>
                ) : (
                  <button type="button" onClick={apply} className="press w-full rounded-full bg-white py-2.5 text-[14px] font-semibold text-slate-950 hover:bg-slate-100">
                    Apply recommendation
                  </button>
                )}
              </div>
            </Row>
          )}
        </div>

        <div key={changedAt} className="grouped animate-[flash_0.9s_ease-out] p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-[13px] text-slate-400">7-day projection</div>
            <div className="text-[12px] text-slate-500">{PLAN_NAME[kind]}</div>
          </div>
          <div className={`mt-1 text-[26px] font-bold tracking-tight ${saved >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {saved >= 0 ? `${usd(saved)} saved` : `${usd(-saved)} extra loss`}
          </div>
          <div className="text-[13px] text-slate-300">
            Sick {b.clinicalCases} → <b className="text-white">{p.clinicalCases}</b> · Deaths {b.deaths} → <b className="text-white">{p.deaths}</b>
          </div>
          <div className="mt-2">
            <ProjectionChart series={chartSeries(bundle, kind)} hour={hour} actionHour={actionHour} height={64} axes={false} />
          </div>
          <button
            type="button"
            onClick={() => openProjection(true)}
            className="press mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-white/10 py-2 text-[13.5px] font-medium text-white hover:bg-white/15"
          >
            <Maximize2 size={13} /> Open full projection
          </button>
          <div className="mt-1.5 text-center text-[11.5px] text-slate-500">Recomputed in {bundle.computeMs.toFixed(1)} ms · playback retraces this path</div>
        </div>
      </div>
    </div>
  )
}
