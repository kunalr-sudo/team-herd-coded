import { motion } from 'motion/react'
import { Eye, ScanEye } from 'lucide-react'
import { NAIVE_FIX } from '../../sim/cattleEngine'
import { buildStory, type Tone } from '../../sim/narrative'
import { useSim, type PresetId } from '../../store/useSimulationStore'
import { SPRING } from '../ui/spring'

const TONE_DOT: Record<Tone, string> = {
  calm: 'bg-sky-400',
  warn: 'bg-amber-400',
  danger: 'bg-red-500',
  good: 'bg-emerald-400',
}

const PRESETS: { id: PresetId; title: string; hint: string }[] = [
  { id: 1, title: 'Crisis hits', hint: 'Hour 18 · heatwave + Fan B fails' },
  { id: 2, title: 'Hidden spread', hint: 'Hour 36 · reveal silent infections' },
  { id: 3, title: 'Naive fix', hint: `Crank fans +${NAIVE_FIX.fanBoostPct}%, nothing else` },
  { id: 4, title: 'BarnTwin fix', hint: 'Isolate · ventilate · cool · target' },
]

/** Farmer's Eye ↔ AI X-Ray. The selection slides between the two views. */
export function XRayToggle() {
  const xray = useSim((s) => s.xray)
  const setXray = useSim((s) => s.setXray)
  const options = [
    { on: false, label: "Farmer's Eye", icon: <Eye size={15} /> },
    { on: true, label: 'AI X-Ray', icon: <ScanEye size={15} /> },
  ]
  return (
    <div className="panel flex !rounded-full p-1" role="radiogroup" aria-label="View">
      {options.map((o) => {
        const active = xray === o.on
        return (
          <button
            type="button"
            role="radio"
            aria-checked={active}
            key={o.label}
            onClick={() => setXray(o.on)}
            title={o.on ? 'Reveal cows that are infected but not sick yet (X)' : 'What the farmer can see (X)'}
            className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
              active ? 'text-slate-950' : 'text-slate-300 hover:text-white'
            }`}
          >
            {active && (
              <motion.span
                layoutId="xray-pill"
                transition={SPRING}
                className={`absolute inset-0 rounded-full ${o.on ? 'bg-yellow-300 shadow-[0_0_20px_rgba(253,224,71,0.5)]' : 'bg-white'}`}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** One-sentence narration of the current hour, like a caption. */
export function StoryBanner({ className = '' }: { className?: string }) {
  const bundle = useSim((s) => s.bundle)
  const kind = useSim((s) => s.planKind)
  const hour = useSim((s) => s.hour)
  const xray = useSim((s) => s.xray)
  const fault = useSim((s) => s.crisis.fanBFault)
  const story = buildStory(bundle, kind, hour, xray, fault)
  const [lead, ...rest] = story.headline.split(': ')
  const body = rest.join(': ')
  return (
    <div className={`panel flex items-start gap-3 px-4 py-3 ${className}`} aria-live="polite">
      <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${TONE_DOT[story.tone]} ${story.tone === 'danger' ? 'animate-pulse' : ''}`} />
      {/* Keyed on the sentence template (numbers stripped): hourly number changes update in place,
          and only a genuinely new message fades in — no flashing every hour. */}
      <motion.p
        key={story.headline.replace(/[\d.,−-]+/g, '#')}
        initial={{ opacity: 0.25 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="min-w-0 text-[15px] leading-snug text-slate-100 tabular-nums"
      >
        {body ? (
          <>
            <span className="font-semibold text-white">{lead}.</span> {body}
          </>
        ) : (
          story.headline
        )}
      </motion.p>
    </div>
  )
}

/** Expert-view header: toolbar + guided demo + view toggle. */
export default function StoryStepper() {
  const preset = useSim((s) => s.preset)
  const applyPreset = useSim((s) => s.applyPreset)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-2 px-3 pt-3">
      <div className="pointer-events-auto flex w-full items-start gap-3">
        <div className="panel flex shrink-0 items-center gap-3 px-3 py-2">
          <a href="#/" className="flex items-center gap-2" title="BarnTwin home">
            <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-gradient-to-br from-cyan-400 to-emerald-500 text-sm font-black text-slate-950">B</div>
            <div className="leading-tight">
              <div className="text-[14px] font-semibold text-white">BarnTwin</div>
              <div className="text-[11.5px] text-slate-400">Expert view</div>
            </div>
          </a>
          <nav className="flex items-center gap-1 text-[12.5px] font-medium">
            <a href="#/simulate" className="press rounded-full px-2.5 py-1 text-slate-300 hover:bg-white/10 hover:text-white">
              New scenario
            </a>
            <a href="#/pasture" className="press rounded-full px-2.5 py-1 text-slate-300 hover:bg-white/10 hover:text-white">
              Pasture
            </a>
          </nav>
        </div>
        <StoryBanner className="min-w-0 flex-1" />
      </div>
      <div className="pointer-events-auto flex w-full items-center justify-center gap-3">
        <div className="panel flex items-center gap-1 !rounded-full p-1" role="radiogroup" aria-label="Guided demo">
          <span className="px-3 text-[12.5px] font-medium text-slate-400">Guided demo</span>
          {PRESETS.map((p) => {
            const active = preset === p.id
            return (
              <button
                type="button"
                role="radio"
                aria-checked={active}
                key={p.id}
                onClick={() => applyPreset(p.id)}
                title={`${p.hint} (key ${p.id})`}
                className={`press relative flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold transition-colors ${
                  active ? 'text-slate-950' : 'text-slate-200 hover:bg-white/[0.07]'
                }`}
              >
                {active && <motion.span layoutId="preset-pill" transition={SPRING} className={`absolute inset-0 rounded-full ${p.id === 4 ? 'bg-emerald-300' : 'bg-white'}`} />}
                <span className={`relative grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${active ? 'bg-slate-950/15' : 'bg-white/10'}`}>{p.id}</span>
                <span className="relative">{p.title}</span>
              </button>
            )
          })}
        </div>
        <XRayToggle />
      </div>
    </div>
  )
}
