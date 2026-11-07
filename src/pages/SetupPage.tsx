import { ArrowLeft, ArrowRight, BrainCircuit, Check, Droplets, Fan, Flame, Hospital, Pencil, Pill, Play, Sparkles, Wand2, Wind } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import BarnScene from '../components/canvas/BarnScene'
import { usd } from '../sim/advisor'
import { NO_INTERVENTION, type AbxStrategy, type InterventionConfig, type ScenarioSummary } from '../sim/cattleEngine'
import { HERD_SIZE, TIMELINE, hourLabel } from '../sim/constants'
import { penList } from '../sim/narrative'
import { EXAMPLE_PROMPTS, HEAT_MAX, HEAT_MIN, translateScenario, type Interpretation } from '../sim/scenarioParser'
import { useSim } from '../store/useSimulationStore'

type Step = 'crisis' | 'response'
type CrisisMode = 'ai' | 'manual'
type Choice = 'smart' | 'none' | 'own'

function Outcome({ s, base, highlight }: { s: ScenarioSummary; base?: ScenarioSummary; highlight?: boolean }) {
  const saved = base ? base.cost.total - s.cost.total : null
  return (
    <div className={`grid grid-cols-3 gap-2 rounded-lg px-3 py-2 ${highlight ? 'bg-emerald-500/10' : 'bg-slate-900/70'}`}>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Sick</div>
        <div className="text-[18px] font-extrabold text-slate-100">{s.clinicalCases}</div>
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Deaths</div>
        <div className="text-[18px] font-extrabold text-slate-100">{s.deaths}</div>
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{saved === null ? 'Herd loss' : saved >= 0 ? 'Saved' : 'Extra loss'}</div>
        <div className={`text-[18px] font-extrabold ${saved === null ? 'text-red-300' : saved >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
          {saved === null ? usd(s.cost.total) : usd(Math.abs(saved))}
        </div>
      </div>
    </div>
  )
}

function Stepper({ step }: { step: Step }) {
  const items: [Step | 'run', string][] = [
    ['crisis', 'Crisis'],
    ['response', 'Response'],
    ['run', 'Run'],
  ]
  const idx = step === 'crisis' ? 0 : 1
  return (
    <div className="flex items-center gap-2">
      {items.map(([id, label], k) => (
        <div key={id} className="flex items-center gap-2">
          <div
            className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold ${
              k < idx ? 'bg-emerald-500 text-slate-950' : k === idx ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {k < idx ? <Check size={14} /> : k + 1}
          </div>
          <span className={`text-[13px] font-semibold ${k === idx ? 'text-white' : 'text-slate-400'}`}>{label}</span>
          {k < items.length - 1 && <div className="mx-1 h-px w-8 bg-slate-700" />}
        </div>
      ))}
    </div>
  )
}

function ModeTab({ active, onClick, icon, title, sub }: { active: boolean; onClick: () => void; icon: ReactNode; title: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
        active ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'
      }`}
    >
      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{icon}</div>
      <div>
        <div className="text-[14px] font-bold text-slate-100">{title}</div>
        <div className="text-[12px] text-slate-400">{sub}</div>
      </div>
    </button>
  )
}

function CrisisStep({ onNext }: { onNext: () => void }) {
  const crisis = useSim((s) => s.crisis)
  const setCrisis = useSim((s) => s.setCrisis)
  const base = useSim((s) => s.bundle.doNothing.summary)
  const [mode, setMode] = useState<CrisisMode>('ai')
  const [text, setText] = useState('')
  const [result, setResult] = useState<Interpretation | null>(null)

  const translate = () => {
    const r = translateScenario(text || EXAMPLE_PROMPTS[0])
    if (!text) setText(EXAMPLE_PROMPTS[0])
    setResult(r)
    setCrisis(r.crisis)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[26px] font-extrabold text-white">What goes wrong in the barn?</h2>
        <p className="text-[14px] text-slate-400">Describe a crisis in your own words, or set it up yourself. A {HERD_SIZE}-head barn with 8 pens is ready.</p>
      </div>
      <div className="flex gap-3">
        <ModeTab active={mode === 'ai'} onClick={() => setMode('ai')} icon={<Wand2 size={18} />} title="Describe it — AI translates" sub="Type what happens, BarnTwin sets it up" />
        <ModeTab active={mode === 'manual'} onClick={() => setMode('manual')} icon={<Pencil size={18} />} title="Set it up manually" sub="Pick the heat and the fault yourself" />
      </div>

      {mode === 'ai' ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setResult(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) translate()
            }}
            rows={3}
            placeholder={`e.g. "${EXAMPLE_PROMPTS[0]}"`}
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-[14px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            {EXAMPLE_PROMPTS.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => {
                  setText(p)
                  setResult(null)
                }}
                className="max-w-[260px] truncate rounded-full border border-slate-700 px-2.5 py-1 text-[11.5px] text-slate-300 hover:border-slate-500"
                title={p}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={translate}
            className="flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-[14px] font-bold text-slate-950 hover:bg-cyan-300"
          >
            <Sparkles size={16} /> Translate with BarnTwin AI
          </button>
          {result && (
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/5 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                <BrainCircuit size={13} /> BarnTwin understood
              </div>
              <ul className="space-y-0.5 text-[13.5px] text-slate-100">
                {result.understood.map((u) => (
                  <li key={u} className="flex gap-1.5">
                    <Check size={15} className="mt-0.5 shrink-0 text-emerald-400" /> {u}
                  </li>
                ))}
              </ul>
              {result.notes.length > 0 && (
                <ul className="mt-1.5 space-y-0.5 text-[12px] text-amber-200/90">
                  {result.notes.map((n) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              )}
              <button type="button" onClick={() => setMode('manual')} className="mt-1.5 text-[12px] font-semibold text-cyan-300 hover:underline">
                Not quite right? Adjust it manually →
              </button>
            </div>
          )}
          <div className="text-[11px] text-slate-500">Runs locally in your browser — your text is never sent anywhere.</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between text-[14px] font-semibold text-slate-100">
              <span className="flex items-center gap-1.5">
                <Flame size={16} className="text-orange-300" /> Heatwave peak
              </span>
              <span className="font-mono text-orange-300">{crisis.heatwaveTemp}°C</span>
            </div>
            <input
              type="range"
              min={HEAT_MIN}
              max={HEAT_MAX}
              value={crisis.heatwaveTemp}
              onChange={(e) => setCrisis({ heatwaveTemp: Number(e.target.value) })}
              className="mt-2 w-full accent-orange-400"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>{HEAT_MIN}°C warm</span>
              <span>{HEAT_MAX}°C extreme</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCrisis({ fanBFault: !crisis.fanBFault })}
            className={`flex items-center gap-3 rounded-xl border p-3 text-left ${crisis.fanBFault ? 'border-red-500/60 bg-red-500/10' : 'border-slate-700 bg-slate-900/60'}`}
          >
            <Fan size={22} className={crisis.fanBFault ? 'text-red-300' : 'text-slate-500'} />
            <div className="flex-1">
              <div className="text-[14px] font-semibold text-slate-100">Fan B breaks down</div>
              <div className="text-[12px] text-slate-400">
                Centre exhaust fan stops at {hourLabel(TIMELINE.crisisHour)} (Hour {TIMELINE.crisisHour})
              </div>
            </div>
            <span className={`relative h-6 w-11 shrink-0 rounded-full ${crisis.fanBFault ? 'bg-red-500' : 'bg-slate-700'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${crisis.fanBFault ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 p-3">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">If nobody acts, over the next 7 days</div>
        <Outcome s={base} />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (mode === 'ai' && text.trim() && !result) setCrisis(translateScenario(text).crisis)
            onNext()
          }}
          className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-[14px] font-bold text-slate-950 hover:bg-cyan-100"
        >
          Next: choose a response <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

function ChoiceCard({
  active,
  onClick,
  title,
  badge,
  sub,
  children,
}: {
  active: boolean
  onClick: () => void
  title: string
  badge?: string
  sub: string
  children?: ReactNode
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className={`cursor-pointer rounded-xl border p-3 transition-colors ${active ? 'border-cyan-400 bg-cyan-500/5' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'}`}
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${active ? 'border-cyan-400' : 'border-slate-600'}`}>
          {active && <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-slate-100">{title}</span>
            {badge && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10.5px] font-bold text-emerald-300">{badge}</span>}
          </div>
          <div className="text-[12.5px] text-slate-400">{sub}</div>
          {children}
        </div>
      </div>
    </div>
  )
}

function MiniToggle({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[12.5px] font-semibold ${
        on ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100' : 'border-slate-700 text-slate-400 hover:border-slate-500'
      }`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {on && <Check size={14} />}
    </button>
  )
}

function ResponseStep({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const bundle = useSim((s) => s.bundle)
  const kind = useSim((s) => s.planKind)
  const plan = useSim((s) => s.plan)
  const setPlan = useSim((s) => s.setPlan)
  const applyRecommendation = useSim((s) => s.applyRecommendation)
  const resetPlan = useSim((s) => s.resetPlan)
  const [choice, setChoice] = useState<Choice>(kind === 'smart' ? 'smart' : kind === 'none' ? 'none' : 'own')
  const [own, setOwn] = useState<InterventionConfig>(kind === 'custom' || kind === 'naive' ? plan : { ...NO_INTERVENTION, isolate: true })
  const base = bundle.doNothing.summary

  const choose = (c: Choice) => {
    setChoice(c)
    if (c === 'smart') applyRecommendation()
    else if (c === 'none') resetPlan()
    else setPlan(own)
  }
  const updateOwn = (patch: Partial<InterventionConfig>) => {
    const next = { ...own, ...patch }
    setOwn(next)
    setChoice('own')
    setPlan(next)
  }
  const abx: { id: AbxStrategy; label: string }[] = [
    { id: 'reactive', label: 'Only sick cows' },
    { id: 'targeted', label: 'Exposed pens' },
    { id: 'blanket', label: 'Whole barn' },
  ]

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-[26px] font-extrabold text-white">How do you want to respond?</h2>
        <p className="text-[14px] text-slate-400">Each option is simulated for the full week as you choose — the numbers are the model&apos;s projection.</p>
      </div>

      <ChoiceCard
        active={choice === 'smart'}
        onClick={() => choose('smart')}
        title="Use the BarnTwin AI recommendation"
        badge="Recommended"
        sub={`At Hour ${plan.actionHour}: isolate sick calves · rebalance airflow · fans +25% & misters · treat only ${penList(bundle.smart.targetedPens)}`}
      >
        <div className="mt-2">
          <Outcome s={bundle.smart.summary} base={base} highlight={choice === 'smart'} />
        </div>
      </ChoiceCard>

      <ChoiceCard active={choice === 'none'} onClick={() => choose('none')} title="No intervention" sub="See what happens when the farmer only treats cows once they look sick">
        <div className="mt-2">
          <Outcome s={base} />
        </div>
      </ChoiceCard>

      <ChoiceCard active={choice === 'own'} onClick={() => choose('own')} title="Choose my own interventions" sub="Pick what to do and when — compare it against BarnTwin">
        {choice === 'own' && (
          <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-2 gap-1.5">
              <MiniToggle on={own.isolate} onClick={() => updateOwn({ isolate: !own.isolate })} icon={<Hospital size={15} />} label="Isolate sick cows" />
              <MiniToggle on={own.boostVent} onClick={() => updateOwn({ boostVent: !own.boostVent })} icon={<Wind size={15} />} label="Fans +25%" />
              <MiniToggle on={own.rebalance} onClick={() => updateOwn({ rebalance: !own.rebalance })} icon={<Fan size={15} />} label="Rebalance airflow" />
              <MiniToggle on={own.misters} onClick={() => updateOwn({ misters: !own.misters })} icon={<Droplets size={15} />} label="Cooling misters" />
            </div>
            <div className="flex items-center gap-2">
              <Pill size={15} className="text-slate-400" />
              <span className="text-[12.5px] font-semibold text-slate-300">Antibiotics</span>
              <div className="flex flex-1 rounded-lg border border-slate-700 p-0.5">
                {abx.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => updateOwn({ abx: a.id })}
                    className={`flex-1 rounded-md px-2 py-1 text-[12px] font-semibold ${own.abx === a.id ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="whitespace-nowrap text-[12.5px] font-semibold text-slate-300">Act at Hour {own.actionHour}</span>
              <input
                type="range"
                min={TIMELINE.crisisHour}
                max={96}
                step={2}
                value={own.actionHour}
                onChange={(e) => updateOwn({ actionHour: Number(e.target.value) })}
                className="flex-1 accent-cyan-400"
              />
            </div>
            <Outcome s={bundle.current.summary} base={base} highlight />
          </div>
        )}
      </ChoiceCard>

      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[14px] font-semibold text-slate-300 hover:text-white">
          <ArrowLeft size={16} /> Back to the crisis
        </button>
        <button
          type="button"
          onClick={onStart}
          className="flex items-center gap-2 rounded-lg bg-emerald-400 px-6 py-2.5 text-[15px] font-bold text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.45)] hover:bg-emerald-300"
        >
          <Play size={17} /> Start simulation
        </button>
      </div>
    </div>
  )
}

/** Guided setup: 1) crisis (AI translation or manual), 2) response, 3) run on a clean page. */
export default function SetupPage() {
  const [step, setStep] = useState<Step>(() => (window.location.hash.includes('response') ? 'response' : 'crisis'))
  const startRun = useSim((s) => s.startRun)

  useEffect(() => {
    useSim.setState({ playing: false, hour: 30, selectedPen: null, projectionOpen: false })
  }, [])

  return (
    <div className="relative h-full w-full select-none font-sans">
      <div className="absolute inset-0">
        <BarnScene sidePanels={false} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-slate-950/85" />

      <div className="absolute inset-0 flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4">
          <a href="#/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 font-black text-slate-950">B</div>
            <span className="text-[16px] font-bold text-white">BarnTwin</span>
          </a>
          <Stepper step={step} />
          <a href="#/lab" className="text-[12.5px] font-semibold text-slate-400 hover:text-white">
            Expert view →
          </a>
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pb-8 pt-2">
          <div className="w-full max-w-[760px] rounded-2xl border border-slate-700/70 bg-slate-950/85 p-6 shadow-2xl backdrop-blur">
            {step === 'crisis' ? (
              <CrisisStep onNext={() => setStep('response')} />
            ) : (
              <ResponseStep
                onBack={() => setStep('crisis')}
                onStart={() => {
                  startRun()
                  window.location.hash = '#/run'
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
