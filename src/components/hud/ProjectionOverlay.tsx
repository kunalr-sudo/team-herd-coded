import { AnimatePresence, motion } from 'motion/react'
import { Pause, Play, X } from 'lucide-react'
import { useEffect } from 'react'
import { usd } from '../../sim/advisor'
import { NAIVE_FIX, type ScenarioResult } from '../../sim/cattleEngine'
import { HERD_VALUE_USD, hourLabel } from '../../sim/constants'
import { useSim } from '../../store/useSimulationStore'
import { SPRING } from '../ui/spring'
import ProjectionChart from './ProjectionChart'
import { PLAN_NAME, chartSeries, comparedPlan } from './projectionData'

interface Column {
  key: string
  title: string
  sub: string
  r: ScenarioResult
  accent: string
}

function Body() {
  const setOpen = useSim((s) => s.setProjectionOpen)
  const bundle = useSim((s) => s.bundle)
  const kind = useSim((s) => s.planKind)
  const hour = useSim((s) => s.hour)
  const actionHour = useSim((s) => s.plan.actionHour)
  const playing = useSim((s) => s.playing)
  const togglePlay = useSim((s) => s.togglePlay)

  const plan = comparedPlan(bundle, kind)
  const base = bundle.doNothing
  const cols: Column[] = [
    { key: 'none', title: 'Do nothing', sub: 'Treat cows once they look sick', r: base, accent: '#f87171' },
    { key: 'naive', title: 'Naive fan boost', sub: `Fans +${NAIVE_FIX.fanBoostPct}%, nothing else`, r: bundle.naive, accent: '#fbbf24' },
    { key: 'smart', title: 'BarnTwin plan', sub: 'Isolate · air · cool · target', r: bundle.smart, accent: '#34d399' },
  ]
  if (kind === 'custom') cols.push({ key: 'custom', title: 'Your plan', sub: 'Custom choices', r: bundle.current, accent: '#67e8f9' })
  const blanket = bundle.blanketReference.summary.antibioticDoses
  const saved = base.summary.cost.total - plan.summary.cost.total
  const highlightKey = kind === 'none' || kind === 'smart' ? 'smart' : kind === 'naive' ? 'naive' : 'custom'

  const rows: { label: string; get: (r: ScenarioResult) => string; v: (r: ScenarioResult) => number; sub?: boolean }[] = [
    { label: 'Cattle that get sick', get: (r) => String(r.summary.clinicalCases), v: (r) => r.summary.clinicalCases },
    { label: 'Deaths', get: (r) => String(r.summary.deaths), v: (r) => r.summary.deaths },
    { label: 'Peak sick at once', get: (r) => String(r.summary.peakSick), v: (r) => r.summary.peakSick },
    { label: 'Antibiotic doses', get: (r) => String(r.summary.antibioticDoses), v: (r) => r.summary.antibioticDoses },
    { label: 'Total herd loss', get: (r) => usd(r.summary.cost.total), v: (r) => r.summary.cost.total },
    { label: 'Deaths', get: (r) => usd(r.summary.cost.deaths), v: (r) => r.summary.cost.deaths, sub: true },
    { label: 'Lost weight gain', get: (r) => usd(r.summary.cost.weightGain), v: (r) => r.summary.cost.weightGain, sub: true },
    { label: 'Treatment', get: (r) => usd(r.summary.cost.treatment), v: (r) => r.summary.cost.treatment, sub: true },
  ]

  const kpis: [string, string, boolean][] = [
    ['Sick cattle', `${base.summary.clinicalCases} → ${plan.summary.clinicalCases}`, plan.summary.clinicalCases <= base.summary.clinicalCases],
    ['Deaths', `${base.summary.deaths} → ${plan.summary.deaths}`, plan.summary.deaths <= base.summary.deaths],
    ['Antibiotic doses', `${plan.summary.antibioticDoses} of ${blanket}`, plan.summary.antibioticDoses < blanket],
    ['Herd value protected', `${((Math.max(0, saved) / HERD_VALUE_USD) * 100).toFixed(1)}%`, saved >= 0],
  ]

  return (
    <>
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-[13px] font-medium text-slate-400">7-day projection · {PLAN_NAME[kind]}</div>
          <h2 className="display-title mt-1 text-[34px] font-bold text-white">
            {saved >= 0 ? (
              <>
                <span className="text-emerald-300">{usd(saved)}</span> saved compared with doing nothing
              </>
            ) : (
              <>
                <span className="text-red-300">{usd(-saved)}</span> more lost than doing nothing
              </>
            )}
          </h2>
          <p className="mt-2 max-w-[720px] text-[15px] leading-relaxed text-slate-400">
            Recomputed in {bundle.computeMs.toFixed(1)} ms whenever a choice changes. The barn behind this sheet replays exactly this path — it's at {hourLabel(hour)} (hour {hour}).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={togglePlay} className="press flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-[14px] font-medium text-white hover:bg-white/15">
            {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="press grid h-9 w-9 place-items-center rounded-full bg-white/10 text-slate-200 hover:bg-white/15" aria-label="Close projection">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-3">
        {kpis.map(([label, value, good]) => (
          <div key={label} className="grouped px-4 py-3.5">
            <div className="text-[13px] text-slate-400">{label}</div>
            <div className={`mt-0.5 text-[26px] font-bold tracking-tight ${good ? 'text-white' : 'text-red-300'}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grouped mt-3 p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[15px] font-semibold text-white">Infected cattle over the week</div>
          <div className="flex flex-wrap gap-4 text-[12.5px] text-slate-300">
            {chartSeries(bundle, kind).map((s) => (
              <span key={s.label} className="flex items-center gap-1.5">
                <svg width="20" height="6" aria-hidden>
                  <line x1="0" x2="20" y1="3" y2="3" stroke={s.color} strokeWidth={2.5} strokeDasharray={s.dash} />
                </svg>
                {s.label}
              </span>
            ))}
            <span className="text-cyan-300">┆ BarnTwin acts</span>
          </div>
        </div>
        <ProjectionChart series={chartSeries(bundle, kind)} hour={hour} actionHour={actionHour} width={1000} height={230} />
        <div className="mt-1 text-[12px] text-slate-500">Includes silent infections. Solid = already played, faded = still to come.</div>
      </div>

      <div className="grouped mt-3 overflow-hidden">
        <table className="w-full text-[14px]">
          <thead>
            <tr>
              <th className="w-[26%] px-4 pt-3.5 pb-2 text-left text-[13px] font-medium text-slate-400">Over 7 days</th>
              {cols.map((c) => (
                <th key={c.key} className={`px-4 pt-3.5 pb-2 text-left ${c.key === highlightKey ? 'bg-white/[0.04]' : ''}`}>
                  <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
                    <span className="h-2 w-2 rounded-full" style={{ background: c.accent }} />
                    {c.title}
                  </div>
                  <div className="text-[12px] font-normal text-slate-500">{c.sub}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const best = Math.min(...cols.map((c) => row.v(c.r)))
              return (
                <tr key={`${row.label}-${i}`} className="border-t border-white/[0.06]">
                  <td className={`px-4 py-2 ${row.sub ? 'pl-8 text-[13px] text-slate-500' : 'text-slate-300'}`}>{row.label}</td>
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-2 tabular-nums ${c.key === highlightKey ? 'bg-white/[0.04]' : ''} ${
                        row.v(c.r) === best ? 'font-semibold text-emerald-300' : row.sub ? 'text-[13px] text-slate-400' : 'text-slate-200'
                      }`}
                    >
                      {row.get(c.r)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">
        Costs: $45 per sick-cow treatment, $28 per preventive dose, $115–$260 lost weight gain per lung-damaged animal, $1,800 per death, plus heat-stress weight
        loss. Press Esc to return to the barn.
      </p>
    </>
  )
}

/** Modal sheet over the simulation (which keeps running behind it). */
export default function ProjectionOverlay() {
  const open = useSim((s) => s.projectionOpen)
  const setOpen = useSim((s) => s.setProjectionOpen)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="7-day projection"
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.97 }}
            transition={SPRING}
            className="sheet max-h-full w-full max-w-[1080px] overflow-y-auto rounded-[28px] p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <Body />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
