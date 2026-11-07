import { Fan, Flame, Hospital, Layers, Pill, SlidersHorizontal, Wind, Droplets } from 'lucide-react'
import type { ReactNode } from 'react'
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
  const onCls =
    accent === 'red' ? 'border-red-500/60 bg-red-500/10' : 'border-emerald-500/60 bg-emerald-500/10'
  const knob = accent === 'red' ? 'bg-red-500' : 'bg-emerald-500'
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
        on ? onCls : 'border-slate-700/60 bg-slate-900/40 hover:border-slate-500'
      }`}
    >
      <span className={on ? (accent === 'red' ? 'text-red-300' : 'text-emerald-300') : 'text-slate-500'}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold text-slate-100">{title}</span>
        <span className="block text-[10.5px] leading-tight text-slate-400">{sub}</span>
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? knob : 'bg-slate-700'}`}>
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  )
}

const Section = ({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
      {icon}
      {title}
    </div>
    {children}
  </div>
)

const LAYERS: { id: HeatmapMode; label: string }[] = [
  { id: 'germ', label: 'Germ Plume & Disease Risk' },
  { id: 'heat', label: 'Heat Stress Zone' },
  { id: 'ammonia', label: 'Stagnant Air & Ammonia' },
  { id: 'none', label: 'Off' },
]

export default function InterventionDeck() {
  const crisis = useSim((s) => s.crisis)
  const plan = useSim((s) => s.plan)
  const setCrisis = useSim((s) => s.setCrisis)
  const setPlan = useSim((s) => s.setPlan)
  const heatmap = useSim((s) => s.heatmap)
  const setHeatmap = useSim((s) => s.setHeatmap)
  const xray = useSim((s) => s.xray)
  const current = useSim((s) => s.bundle.current)
  const targeted = current.config.abx === 'targeted' ? current.targetedPens : []

  const abxOptions: { id: AbxStrategy; label: string; sub: string }[] = [
    { id: 'reactive', label: 'Reactive only', sub: 'treat cows once visibly sick' },
    { id: 'blanket', label: 'Whole-barn blanket', sub: `${HERD_SIZE} preventive doses` },
    {
      id: 'targeted',
      label: 'Targeted exposed pens',
      sub: targeted.length ? `${penList(targeted)} · ${current.summary.metaphylaxisDoses} doses` : 'AI picks the 2 most exposed pens (~80 doses)',
    },
  ]

  return (
    <div className="panel pointer-events-auto absolute left-3 top-[156px] bottom-[96px] z-10 w-[292px] space-y-4 overflow-y-auto p-3">
      <Section title="Crisis setup" icon={<Flame size={12} />}>
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-2.5 py-2">
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
        <Toggle
          on={crisis.fanBFault}
          onChange={(v) => setCrisis({ fanBFault: v })}
          icon={<Fan size={16} />}
          title="Fan B fails at Hour 18"
          sub="Centre-east exhaust bank stalls"
          accent="red"
        />
      </Section>

      <Section title="Interventions" icon={<SlidersHorizontal size={12} />}>
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-2.5 py-2">
          <div className="flex justify-between text-[12.5px] font-semibold text-slate-100">
            <span>Act at</span>
            <span className="font-mono text-cyan-300">Hour {plan.actionHour}</span>
          </div>
          <input
            type="range"
            min={TIMELINE.crisisHour}
            max={96}
            step={2}
            value={plan.actionHour}
            onChange={(e) => setPlan({ actionHour: Number(e.target.value) })}
            className="mt-1 w-full accent-cyan-400"
          />
          <div className="text-[10.5px] text-slate-400">
            BarnTwin can act at Hour {TIMELINE.defaultActionHour}; farmers usually notice the outbreak ~48 h later.
          </div>
        </div>
        <Toggle
          on={plan.isolate}
          onChange={(v) => setPlan({ isolate: v })}
          icon={<Hospital size={16} />}
          title="Move sick cows to Hospital Pen"
          sub="Downwind ward next to working Fan C"
        />
        <Toggle
          on={plan.boostVent}
          onChange={(v) => setPlan({ boostVent: v })}
          icon={<Wind size={16} />}
          title="Boost cross-ventilation +25%"
          sub="Run remaining fans harder"
        />
        <Toggle
          on={plan.rebalance}
          onChange={(v) => setPlan({ rebalance: v })}
          icon={<Fan size={16} />}
          title="Rebalance airflow"
          sub="Close Pen 3 baffles + portable fan at B"
        />
        <Toggle
          on={plan.misters}
          onChange={(v) => setPlan({ misters: v })}
          icon={<Droplets size={16} />}
          title="Turn on cooling misters"
          sub="Evaporative cooling at West inlets"
        />
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-100">
            <Pill size={14} className="text-slate-400" /> Antibiotic strategy
          </div>
          <div className="space-y-1">
            {abxOptions.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => setPlan({ abx: o.id })}
                className={`w-full rounded-md border px-2 py-1 text-left transition-colors ${
                  plan.abx === o.id
                    ? 'border-cyan-400/70 bg-cyan-500/15 text-slate-100'
                    : 'border-transparent text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <div className="text-[12px] font-semibold">{o.label}</div>
                <div className="text-[10.5px] text-slate-400">{o.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Floor map layer" icon={<Layers size={12} />}>
        <div className="grid grid-cols-1 gap-1">
          {LAYERS.map((l) => (
            <button
              type="button"
              key={l.id}
              onClick={() => setHeatmap(l.id)}
              className={`rounded-md border px-2 py-1 text-left text-[12px] font-semibold transition-colors ${
                heatmap === l.id
                  ? 'border-cyan-400/70 bg-cyan-500/15 text-slate-100'
                  : 'border-slate-700/60 text-slate-400 hover:border-slate-500'
              }`}
            >
              {l.label}
              {l.id === 'germ' && !xray && <span className="ml-1 text-[10px] text-yellow-300">(turns on X-Ray)</span>}
            </button>
          ))}
        </div>
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
  )
}
