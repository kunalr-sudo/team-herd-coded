import { Activity, DollarSign, Pill, ShieldCheck, Skull } from 'lucide-react'
import type { ReactNode } from 'react'
import { HERD_VALUE_USD, HOURS } from '../../sim/constants'
import type { ScenarioResult } from '../../sim/cattleEngine'
import { useSim } from '../../store/useSimulationStore'

const usd = (n: number) => `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`

const PLAN_LABEL = {
  none: 'BarnTwin Smart Protocol',
  naive: 'Naive Fan Boost',
  smart: 'BarnTwin Smart Protocol',
  custom: 'Your Custom Plan',
}

function Chart({ base, naive, plan, hour, actionHour }: { base: ScenarioResult; naive: ScenarioResult; plan: ScenarioResult; hour: number; actionHour: number }) {
  const W = 300
  const H = 128
  const pad = { l: 26, r: 6, t: 8, b: 16 }
  const series = (r: ScenarioResult) => r.frames.map((f) => f.totals.sick + f.totals.quiet)
  const sb = series(base)
  const sn = series(naive)
  const sp = series(plan)
  const maxY = Math.max(10, ...sb, ...sn, ...sp)
  const x = (h: number) => pad.l + (h / HOURS) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - v / maxY) * (H - pad.t - pad.b)
  const path = (s: number[]) => s.map((v, h) => `${h === 0 ? 'M' : 'L'}${x(h).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const showNaive = plan !== naive
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={W - pad.r} y1={y(maxY * f)} y2={y(maxY * f)} stroke="#1e293b" />
          <text x={pad.l - 4} y={y(maxY * f) + 3} textAnchor="end" fontSize="8" fill="#64748b">
            {Math.round(maxY * f)}
          </text>
        </g>
      ))}
      {[0, 24, 48, 72, 96, 120, 144, 168].map((h) => (
        <text key={h} x={x(h)} y={H - 4} textAnchor="middle" fontSize="8" fill="#64748b">
          {h}h
        </text>
      ))}
      <line x1={x(actionHour)} x2={x(actionHour)} y1={pad.t} y2={H - pad.b} stroke="#22d3ee" strokeDasharray="2 3" opacity={0.6} />
      <path d={path(sb)} fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 4" />
      {showNaive && <path d={path(sn)} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="1.5 3" />}
      <path d={path(sp)} fill="none" stroke={plan === naive ? '#f59e0b' : '#22c55e'} strokeWidth={2.4} />
      <line x1={x(hour)} x2={x(hour)} y1={pad.t} y2={H - pad.b} stroke="#e2e8f0" opacity={0.7} />
      <circle cx={x(hour)} cy={y(sp[hour])} r={3} fill={plan === naive ? '#f59e0b' : '#22c55e'} />
      <circle cx={x(hour)} cy={y(sb[hour])} r={3} fill="#ef4444" />
    </svg>
  )
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone,
  title,
}: {
  icon: ReactNode
  label: string
  value: string
  sub: ReactNode
  tone: 'good' | 'bad' | 'neutral'
  title?: string
}) {
  const color = tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-red-300' : 'text-slate-100'
  return (
    <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2" title={title}>
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {icon}
        {label}
      </div>
      <div className={`text-[24px] font-extrabold leading-tight ${color}`}>{value}</div>
      <div className="text-[11px] leading-snug text-slate-400">{sub}</div>
    </div>
  )
}

export default function ImpactDashboard() {
  const bundle = useSim((s) => s.bundle)
  const kind = useSim((s) => s.planKind)
  const hour = useSim((s) => s.hour)
  const actionHour = useSim((s) => s.plan.actionHour)
  const base = bundle.doNothing
  const plan = kind === 'none' ? bundle.smart : bundle.current
  const b = base.summary
  const p = plan.summary
  const saved = b.cost.total - p.cost.total
  const deathsAvoided = b.deaths - p.deaths
  const wgSaved = b.cost.weightGain - p.cost.weightGain
  const txSaved = b.cost.treatment - p.cost.treatment
  const deathSaved = b.cost.deaths - p.cost.deaths
  const blanket = bundle.blanketReference.summary.antibioticDoses
  const abxCut = 1 - p.antibioticDoses / blanket
  const tooltip = `Cattle deaths: ${b.deaths} → ${p.deaths} (${usd(deathSaved)})\nWeight gain preserved: ${usd(wgSaved)}\nTreatment savings: ${usd(txSaved)}`

  return (
    <div className="panel pointer-events-auto absolute right-3 top-[156px] bottom-[96px] z-10 w-[332px] space-y-2.5 overflow-y-auto p-3">
      <div>
        <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">7-day impact projection</div>
        <div className="mt-1 grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1">
            <div className="font-bold text-red-300">Without BarnTwin</div>
            <div className="text-slate-400">Do nothing</div>
          </div>
          <div
            className={`rounded-md border px-2 py-1 ${kind === 'naive' ? 'border-amber-500/40 bg-amber-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}
          >
            <div className={`font-bold ${kind === 'naive' ? 'text-amber-300' : 'text-emerald-300'}`}>
              {kind === 'naive' ? 'Naive Fix' : 'With BarnTwin'}
            </div>
            <div className="text-slate-400">
              {PLAN_LABEL[kind]}
              {kind === 'none' && ' (press 4)'}
            </div>
          </div>
        </div>
      </div>

      <Stat
        icon={<DollarSign size={12} />}
        label={saved >= 0 ? 'Herd loss prevented' : 'Extra herd loss'}
        value={usd(Math.abs(saved))}
        tone={saved >= 0 ? 'good' : 'bad'}
        title={tooltip}
        sub={
          <span className="grid grid-cols-[1fr_auto] gap-x-2">
            <span>{deathsAvoided >= 0 ? `Deaths avoided (${deathsAvoided} head)` : `Extra deaths (${-deathsAvoided} head)`}</span>
            <span className="font-mono text-slate-300">{usd(deathSaved)}</span>
            <span>{wgSaved >= 0 ? 'Weight gain preserved' : 'Extra weight-gain loss'}</span>
            <span className="font-mono text-slate-300">{usd(wgSaved)}</span>
            <span>{txSaved >= 0 ? 'Treatment savings' : 'Extra treatment cost'}</span>
            <span className="font-mono text-slate-300">{usd(txSaved)}</span>
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={<Activity size={12} />}
          label="Sick cows"
          value={`${b.clinicalCases} → ${p.clinicalCases}`}
          tone={p.clinicalCases < b.clinicalCases ? 'good' : 'bad'}
          sub={
            p.clinicalCases <= b.clinicalCases
              ? `${b.clinicalCases - p.clinicalCases} prevented`
              : `${p.clinicalCases - b.clinicalCases} more`
          }
        />
        <Stat
          icon={<Skull size={12} />}
          label="Deaths"
          value={`${b.deaths} → ${p.deaths}`}
          tone={p.deaths < b.deaths ? 'good' : p.deaths > b.deaths ? 'bad' : 'neutral'}
          sub={`${usd(b.cost.deaths)} → ${usd(p.cost.deaths)}`}
        />
      </div>
      <Stat
        icon={<Pill size={12} />}
        label="Antibiotic reduction"
        value={`${Math.round(abxCut * 100)}%`}
        tone={abxCut > 0 ? 'good' : 'bad'}
        sub={`${p.antibioticDoses} doses vs ${blanket} for whole-barn blanket treatment`}
      />

      <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 px-2 py-2">
        <div className="mb-1 flex items-center justify-between px-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
          <span>Infected cattle (incl. hidden)</span>
        </div>
        <Chart base={base} naive={bundle.naive} plan={plan} hour={hour} actionHour={actionHour} />
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-1 text-[10.5px] text-slate-400">
          <span className="text-red-300">- - Do nothing</span>
          {plan !== bundle.naive && <span className="text-amber-300">··· Naive fan boost</span>}
          <span className={plan === bundle.naive ? 'text-amber-300' : 'text-emerald-300'}>
            ━ {kind === 'naive' ? 'Naive fan boost' : 'With BarnTwin'}
          </span>
          <span className="text-cyan-300">┆ act</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-1 text-[10.5px] text-slate-500">
        <ShieldCheck size={12} />
        Herd value {usd(HERD_VALUE_USD)} · 5 coupled trajectories in {bundle.computeMs.toFixed(1)} ms
      </div>
    </div>
  )
}
