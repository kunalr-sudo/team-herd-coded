import { Brain, Eye } from 'lucide-react'
import { buildStory, type Tone } from '../../sim/narrative'
import { useSim, type PresetId } from '../../store/useSimulationStore'

const TONE: Record<Tone, { border: string; dot: string; label: string }> = {
  calm: { border: 'border-sky-500/40', dot: 'bg-sky-400', label: 'text-sky-300' },
  warn: { border: 'border-amber-500/50', dot: 'bg-amber-400', label: 'text-amber-300' },
  danger: { border: 'border-red-500/60', dot: 'bg-red-500 animate-pulse', label: 'text-red-300' },
  good: { border: 'border-emerald-500/50', dot: 'bg-emerald-400', label: 'text-emerald-300' },
}

const PRESETS: { id: PresetId; title: string; sub: string }[] = [
  { id: 1, title: '1. Crisis Hits', sub: 'Hour 18 · heatwave + Fan B fails' },
  { id: 2, title: '2. Hidden Spread', sub: 'Hour 36 · reveal silent infections' },
  { id: 3, title: '3. Why Naive Fan Boost Fails', sub: 'Crank fans +25%, nothing else' },
  { id: 4, title: '4. BarnTwin Smart Fix', sub: 'Isolate · ventilate · cool · target' },
]

function XRayToggle() {
  const xray = useSim((s) => s.xray)
  const setXray = useSim((s) => s.setXray)
  return (
    <div className="flex rounded-xl border border-slate-600/50 bg-slate-950/80 p-1 text-[13px] font-semibold shadow-lg">
      <button
        type="button"
        onClick={() => setXray(false)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
          !xray ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Eye size={15} /> Farmer&apos;s Eye
      </button>
      <button
        type="button"
        onClick={() => setXray(true)}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
          xray ? 'bg-yellow-400 text-slate-950 shadow-[0_0_18px_rgba(250,204,21,0.55)]' : 'text-slate-400 hover:text-yellow-200'
        }`}
      >
        <Brain size={15} /> BarnTwin AI X-Ray
      </button>
    </div>
  )
}

export default function StoryStepper() {
  const bundle = useSim((s) => s.bundle)
  const kind = useSim((s) => s.planKind)
  const hour = useSim((s) => s.hour)
  const xray = useSim((s) => s.xray)
  const fault = useSim((s) => s.crisis.fanBFault)
  const preset = useSim((s) => s.preset)
  const applyPreset = useSim((s) => s.applyPreset)
  const story = buildStory(bundle, kind, hour, xray, fault)
  const tone = TONE[story.tone]

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-2 px-4 pt-3">
      <div className="pointer-events-auto flex w-full max-w-[1180px] items-center gap-3">
        <div className="panel flex shrink-0 items-center gap-2 px-3 py-2">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-cyan-400 to-emerald-500 grid place-items-center text-slate-950 font-black text-sm">
            B
          </div>
          <div className="leading-tight">
            <div className="text-[13px] font-bold tracking-wide text-slate-100">BarnTwin</div>
            <div className="text-[10px] text-slate-400">320-head cattle barn · digital twin</div>
          </div>
        </div>
        <div className={`panel flex flex-1 items-center gap-3 px-4 py-2.5 border ${tone.border}`}>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
          <div className="min-w-0">
            <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${tone.label}`}>What&apos;s happening now</div>
            <div className="text-[15px] font-medium leading-snug text-slate-50">{story.headline}</div>
          </div>
        </div>
      </div>
      <div className="pointer-events-auto flex w-full max-w-[1180px] items-center gap-2">
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className={`min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-left transition-all ${
              preset === p.id
                ? p.id === 4
                  ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_16px_rgba(16,185,129,0.35)]'
                  : 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_16px_rgba(34,211,238,0.3)]'
                : 'border-slate-700/70 bg-slate-950/75 hover:border-slate-500'
            }`}
          >
            <div className="text-[12.5px] font-bold text-slate-100">{p.title}</div>
            <div className="truncate text-[10.5px] text-slate-400">{p.sub}</div>
          </button>
        ))}
        <XRayToggle />
      </div>
    </div>
  )
}
