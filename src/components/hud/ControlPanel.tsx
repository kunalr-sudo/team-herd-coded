import { ChevronDown, ChevronLeft, Clock, Droplets, Fan, Flame, Hospital, Layers, Pill, RotateCcw, SlidersHorizontal, Stethoscope, Wind } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { HERD_SIZE, TIMELINE } from '../../sim/constants'
import type { AbxStrategy } from '../../sim/cattleEngine'
import { penList } from '../../sim/narrative'
import { useSim, type HeatmapMode } from '../../store/useSimulationStore'
import { HEATMAP_LEGEND } from '../canvas/heatmapLegend'

function Toggle({
  on,
  onChange,
  icon,
  title,
  sub,
  accent = 'emerald',
}: {
  on: boolean
  onChange: (v: boolean) => void
  icon: ReactNode
  title: string
  sub: string
  accent?: 'emerald' | 'red'
}) {
  const onCls = accent === 'red' ? 'border-red-500/60 bg-red-500/10' : 'border-emerald-500/60 bg-emerald-500/10'
  const knob = accent === 'red' ? 'bg-red-500' : 'bg-emerald-500'
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
        on ? onCls : 'border-slate-700/60 bg-slate-900/40 hover:border-slate-500'
      }`}
    >
      <span className={on ? (accent === 'red' ? 'text-red-300' : 'text-emerald-300') : 'text-slate-500'}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold text-slate-100">{title}</span>
        <span className="block text-[10.5px] leading-tight text-slate-400">{sub}</span>
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? knob : 'bg-slate-700'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

function Section({ title, hint, icon, children, defaultOpen = true }: { title: string; hint?: string; icon: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-slate-800/80">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left">
        <span className="text-slate-400">{icon}</span>
        <span className="flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300">{title}</span>
          {hint && <span className="block text-[10.5px] text-slate-500">{hint}</span>}
        </span>
        <ChevronDown size={15} className={`text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="space-y-1.5 px-2 pb-2">{children}</div>}
    </div>
  )
}

const LAYERS: { id: HeatmapMode; label: string }[] = [
  { id: 'germ', label: 'Germ plume' },
  { id: 'heat', label: 'Heat stress' },
  { id: 'ammonia', label: 'Ammonia' },
  { id: 'none', label: 'Off' },
]

export default function ControlPanel() {
  const open = useSim((s) => s.controlsOpen)
  const toggle = useSim((s) => s.toggleControls)
  const crisis = useSim((s) => s.crisis)
  const plan = useSim((s) => s.plan)
  const kind = useSim((s) => s.planKind)
  const setCrisis = useSim((s) => s.setCrisis)
  const setPlan = useSim((s) => s.setPlan)
  const resetPlan = useSim((s) => s.resetPlan)
  const applyRecommendation = useSim((s) => s.applyRecommendation)
  const heatmap = useSim((s) => s.heatmap)
  const setHeatmap = useSim((s) => s.setHeatmap)
  const xray = useSim((s) => s.xray)
  const current = useSim((s) => s.bundle.current)
  const targeted = current.config.abx === 'targeted' ? current.targetedPens : []

  if (!open)
    return (
      <button
        type="button"
        onClick={toggle}
        className="panel pointer-events-auto absolute left-3 top-[156px] z-10 flex items-center gap-2 px-3 py-2 text-[12.5px] font-semibold text-slate-200 hover:text-white"
      >
        <SlidersHorizontal size={16} className="text-cyan-300" /> Crisis & response controls
      </button>
    )

  const abxOptions: { id: AbxStrategy; label: string; sub: string }[] = [
    { id: 'reactive', label: 'Reactive only', sub: 'Treat cows once they look sick' },
    { id: 'blanket', label: 'Whole-barn blanket', sub: `${HERD_SIZE} preventive doses` },
    {
      id: 'targeted',
      label: 'Targeted (BarnTwin)',
      sub: targeted.length ? `${penList(targeted)} · ${current.summary.metaphylaxisDoses} doses` : 'Only the 2 most exposed pens',
    },
  ]

  return (
    <div className="panel pointer-events-auto absolute left-3 top-[156px] bottom-[96px] z-10 flex w-[296px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-700/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-cyan-300" />
          <span className="text-[13px] font-bold text-slate-100">Crisis & response</span>
        </div>
        <button type="button" onClick={toggle} className="text-slate-400 hover:text-white" aria-label="Collapse panel" title="Collapse">
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={applyRecommendation}
            disabled={kind === 'smart'}
            className="rounded-lg bg-emerald-500 px-2 py-1.5 text-[12px] font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-default disabled:opacity-50"
          >
            {kind === 'smart' ? '✓ BarnTwin plan' : 'Use BarnTwin plan'}
          </button>
          <button
            type="button"
            onClick={resetPlan}
            disabled={kind === 'none'}
            className="flex items-center justify-center gap-1 rounded-lg border border-slate-600 px-2 py-1.5 text-[12px] font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-40"
          >
            <RotateCcw size={13} /> No action
          </button>
        </div>

        <Section title="Crisis" hint="What goes wrong" icon={<Flame size={13} />}>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-2.5 py-1.5">
            <div className="flex justify-between text-[12.5px] font-semibold text-slate-100">
              <span>Heatwave peak</span>
              <span className="font-mono text-orange-300">{crisis.heatwaveTemp}°C</span>
            </div>
            <input
              type="range"
              min={30}
              max={42}
              value={crisis.heatwaveTemp}
              onChange={(e) => setCrisis({ heatwaveTemp: Number(e.target.value) })}
              className="mt-1 w-full accent-orange-400"
            />
          </div>
          <Toggle on={crisis.fanBFault} onChange={(v) => setCrisis({ fanBFault: v })} icon={<Fan size={16} />} title="Fan B fails at Hour 18" sub="Centre exhaust fan stalls" accent="red" />
        </Section>

        <Section title="Disease response" hint="Stop the spread" icon={<Stethoscope size={13} />}>
          <Toggle on={plan.isolate} onChange={(v) => setPlan({ isolate: v })} icon={<Hospital size={16} />} title="Isolate sick cows" sub="Move them to the downwind Hospital Pen" />
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-1.5">
            <div className="mb-1 flex items-center gap-1.5 px-1 text-[12.5px] font-semibold text-slate-100">
              <Pill size={14} className="text-slate-400" /> Antibiotics
            </div>
            {abxOptions.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => setPlan({ abx: o.id })}
                className={`w-full rounded-md border px-2 py-1 text-left transition-colors ${
                  plan.abx === o.id ? 'border-cyan-400/70 bg-cyan-500/15 text-slate-100' : 'border-transparent text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="text-[12px] font-semibold">{o.label}</div>
                <div className="text-[10.5px] text-slate-400">{o.sub}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Climate response" hint="Fix the air that spreads it" icon={<Wind size={13} />}>
          <Toggle on={plan.boostVent} onChange={(v) => setPlan({ boostVent: v })} icon={<Wind size={16} />} title="Boost ventilation +25%" sub="Run the working fans harder" />
          <Toggle on={plan.rebalance} onChange={(v) => setPlan({ rebalance: v })} icon={<Fan size={16} />} title="Rebalance airflow" sub="Close Pen 3 baffles + portable fan at B" />
          <Toggle on={plan.misters} onChange={(v) => setPlan({ misters: v })} icon={<Droplets size={16} />} title="Cooling misters" sub="Evaporative cooling at the inlets" />
        </Section>

        <Section title="When to act" hint={`Hour ${plan.actionHour}`} icon={<Clock size={13} />}>
          <div className="px-1">
            <input
              type="range"
              min={TIMELINE.crisisHour}
              max={96}
              step={2}
              value={plan.actionHour}
              onChange={(e) => setPlan({ actionHour: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
            <div className="text-[10.5px] leading-snug text-slate-400">
              BarnTwin spots the hidden spread by Hour {TIMELINE.defaultActionHour}. A farmer usually notices ~48 h later — try acting late to see the cost of waiting.
            </div>
          </div>
        </Section>

        <Section title="Floor map" hint="Colour the barn floor by…" icon={<Layers size={13} />} defaultOpen={false}>
          <div className="grid grid-cols-4 gap-1">
            {LAYERS.map((l) => (
              <button
                type="button"
                key={l.id}
                onClick={() => setHeatmap(l.id)}
                className={`rounded-md border px-1 py-1 text-[11px] font-semibold transition-colors ${
                  heatmap === l.id ? 'border-cyan-400/70 bg-cyan-500/15 text-slate-100' : 'border-slate-700/60 text-slate-400 hover:border-slate-500'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          {heatmap === 'germ' && !xray && <div className="text-[10.5px] text-yellow-300">Germ plume needs AI X-Ray (switched on).</div>}
          {heatmap !== 'none' && (
            <div>
              <div className="h-2 rounded-full" style={{ background: HEATMAP_LEGEND[heatmap].gradient }} />
              <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
                <span>{HEATMAP_LEGEND[heatmap].lo}</span>
                <span>{HEATMAP_LEGEND[heatmap].label}</span>
                <span>{HEATMAP_LEGEND[heatmap].hi}</span>
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
