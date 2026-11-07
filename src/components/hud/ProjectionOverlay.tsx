import { X } from 'lucide-react'
import { useEffect } from 'react'
import { usd } from '../../sim/advisor'
import type { ScenarioResult } from '../../sim/cattleEngine'
import { HERD_VALUE_USD, hourLabel } from '../../sim/constants'
import { useSim } from '../../store/useSimulationStore'
import ProjectionChart from './ProjectionChart'
import { PLAN_NAME, chartSeries, comparedPlan } from './projectionData'

interface Column {
  key: string
  title: string
  sub: string
  r: ScenarioResult
  accent: string
}

export default function ProjectionOverlay() {
  const open = useSim((s) => s.projectionOpen)
  const setOpen = useSim((s) => s.setProjectionOpen)
  const bundle = useSim((s) => s.bundle)
  const kind = useSim((s) => s.planKind)
  const hour = useSim((s) => s.hour)
  const actionHour = useSim((s) => s.plan.actionHour)
  const playing = useSim((s) => s.playing)
  const togglePlay = useSim((s) => s.togglePlay)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  const plan = comparedPlan(bundle, kind)
  const base = bundle.doNothing
  const cols: Column[] = [
    { key: 'none', title: 'Do nothing', sub: 'Farmer reacts once cows look sick', r: base, accent: '#ef4444' },
    { key: 'naive', title: 'Naive fan boost', sub: 'Crank fans +25%, nothing else', r: bundle.naive, accent: '#f59e0b' },
    { key: 'smart', title: 'BarnTwin recommendation', sub: 'Isolate · rebalance · cool · targeted treatment', r: bundle.smart, accent: '#22c55e' },
  ]
  if (kind === 'custom') cols.push({ key: 'custom', title: 'Your custom plan', sub: 'From the control panel', r: bundle.current, accent: '#22d3ee' })
  const blanket = bundle.blanketReference.summary.antibioticDoses
  const saved = base.summary.cost.total - plan.summary.cost.total

  const rows: { label: string; get: (r: ScenarioResult) => string; better: (r: ScenarioResult) => number }[] = [
    { label: 'Cattle that get sick', get: (r) => String(r.summary.clinicalCases), better: (r) => r.summary.clinicalCases },
    { label: 'Deaths', get: (r) => String(r.summary.deaths), better: (r) => r.summary.deaths },
    { label: 'Total herd loss', get: (r) => usd(r.summary.cost.total), better: (r) => r.summary.cost.total },
    { label: '  · deaths', get: (r) => usd(r.summary.cost.deaths), better: (r) => r.summary.cost.deaths },
    { label: '  · lost weight gain', get: (r) => usd(r.summary.cost.weightGain), better: (r) => r.summary.cost.weightGain },
    { label: '  · treatment', get: (r) => usd(r.summary.cost.treatment), better: (r) => r.summary.cost.treatment },
    { label: 'Antibiotic doses', get: (r) => `${r.summary.antibioticDoses}`, better: (r) => r.summary.antibioticDoses },
    { label: 'Peak sick at once', get: (r) => `${r.summary.peakSick}`, better: (r) => r.summary.peakSick },
  ]

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-6 backdrop-blur-[3px]" onClick={() => setOpen(false)}>
      <div
        className="max-h-full w-full max-w-[1100px] overflow-y-auto rounded-2xl border border-slate-600/50 bg-slate-950/95 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">7-day projection · {PLAN_NAME[kind]}</div>
            <h2 className="mt-1 text-[28px] font-extrabold leading-tight text-slate-50">
              {saved >= 0 ? (
                <>
                  <span className="text-emerald-300">{usd(saved)}</span> of herd loss prevented vs doing nothing
                </>
              ) : (
                <>
                  This plan <span className="text-red-300">loses {usd(-saved)} more</span> than doing nothing
                </>
              )}
            </h2>
            <p className="mt-1 text-[14px] text-slate-400">
              Projection is recomputed the instant you change a control ({bundle.computeMs.toFixed(1)} ms for every scenario). The simulation behind this panel replays exactly this path. Now at Hour {hour} ({hourLabel(hour)}).
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={togglePlay} className="rounded-lg border border-slate-600 px-3 py-1.5 text-[13px] font-semibold text-slate-200 hover:border-cyan-400">
              {playing ? 'Pause' : 'Play'} simulation
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close projection">
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          {[
            ['Sick cattle', `${base.summary.clinicalCases} → ${plan.summary.clinicalCases}`, plan.summary.clinicalCases <= base.summary.clinicalCases],
            ['Deaths', `${base.summary.deaths} → ${plan.summary.deaths}`, plan.summary.deaths <= base.summary.deaths],
            ['Antibiotic doses', `${plan.summary.antibioticDoses} vs ${blanket}`, plan.summary.antibioticDoses < blanket],
            ['Share of herd value protected', `${((Math.max(0, saved) / HERD_VALUE_USD) * 100).toFixed(1)}%`, saved >= 0],
          ].map(([label, value, good]) => (
            <div key={label as string} className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
              <div className={`text-[26px] font-extrabold ${good ? 'text-emerald-300' : 'text-red-300'}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">Infected cattle over the week (including silent infections)</div>
            <div className="flex flex-wrap gap-4 text-[12px]">
              {chartSeries(bundle, kind).map((s) => (
                <span key={s.label} className="flex items-center gap-1.5" style={{ color: s.color }}>
                  <svg width="22" height="6">
                    <line x1="0" x2="22" y1="3" y2="3" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dash} />
                  </svg>
                  {s.label}
                </span>
              ))}
              <span className="text-cyan-300">┆ BarnTwin acts (Hour {actionHour})</span>
              <span className="text-slate-300">│ now</span>
            </div>
          </div>
          <ProjectionChart series={chartSeries(bundle, kind)} hour={hour} actionHour={actionHour} width={1000} height={260} />
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-700/60">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="bg-slate-900/80">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Scenario</th>
                {cols.map((c) => (
                  <th key={c.key} className="px-4 py-2.5 text-left">
                    <div className="font-bold" style={{ color: c.accent }}>
                      {c.title}
                    </div>
                    <div className="text-[11px] font-normal text-slate-400">{c.sub}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const best = Math.min(...cols.map((c) => row.better(c.r)))
                return (
                  <tr key={row.label} className="border-t border-slate-800">
                    <td className="whitespace-pre px-4 py-2 text-slate-400">{row.label}</td>
                    {cols.map((c) => (
                      <td key={c.key} className={`px-4 py-2 font-mono ${row.better(c.r) === best ? 'font-bold text-emerald-300' : 'text-slate-200'}`}>
                        {row.get(c.r)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-slate-500">
          Costs: $45 per sick-cow treatment, $28 per preventive dose, $115–$260 lost weight gain per lung-damaged animal, $1,800 per death, plus heat-stress weight loss. Press Esc or click outside to return to the barn.
        </p>
      </div>
    </div>
  )
}
