import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { ArrowUp, Check, ChevronDown, ChevronLeft, Dna, Droplets, Fan, Flame, Hospital, Pill, Play, SlidersHorizontal, Sparkles, Timer, Wind, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import BarnScene from '../components/canvas/BarnScene'
import { AnimatedNumber, IconTile, Row, Segmented, Switch } from '../components/ui/controls'
import { SPRING } from '../components/ui/spring'
import { NO_INTERVENTION, type AbxStrategy, type InterventionConfig } from '../sim/cattleEngine'
import { TIMELINE, hourLabel } from '../sim/constants'
import { penList } from '../sim/narrative'
import { EXAMPLE_PROMPTS, HEAT_MAX, HEAT_MIN, translateScenario } from '../sim/scenarioParser'
import { useSim } from '../store/useSimulationStore'

type Step = 'crisis' | 'response'
type Choice = 'smart' | 'none' | 'own'

// Remembers the response choice while moving back and forth between steps.
let rememberedChoice: Choice | null = null

const money = (v: number) => `$${Math.round(Math.abs(v)).toLocaleString('en-US')}`
const heatWord = (t: number) => (t >= 40 ? 'Extreme' : t >= 37 ? 'Heatwave' : t >= 34 ? 'Hot' : 'Warm')

/** Steps slide in the direction of travel and return the way they came. */
const stepVariants = {
  enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -48, opacity: 0 }),
}

function PageDots({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${step === 'crisis' ? 1 : 2} of 2`}>
      {(['crisis', 'response'] as Step[]).map((s) => (
        <motion.span key={s} className="h-1.5 rounded-full bg-white" animate={{ width: s === step ? 18 : 6, opacity: s === step ? 1 : 0.35 }} transition={SPRING} />
      ))}
    </div>
  )
}

function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <div className="text-[13px] font-semibold text-cyan-300">{eyebrow}</div>
      <h1 className="display-title mt-1 text-[34px] font-bold text-white">{title}</h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-slate-400">{subtitle}</p>
    </div>
  )
}

/** Spotlight-style field. The interpretation previews live; Return applies it to the controls below. */
function SmartTranslate() {
  const setCrisis = useSim((s) => s.setCrisis)
  const [text, setText] = useState('')
  const [applied, setApplied] = useState<string | null>(null)
  const preview = useMemo(() => (text.trim().length > 3 ? translateScenario(text) : null), [text])

  const apply = (value = text) => {
    if (!value.trim()) return
    const r = translateScenario(value)
    setCrisis(r.crisis)
    setApplied(value)
  }
  const summary = preview && `${preview.crisis.heatwaveTemp}°C ${heatWord(preview.crisis.heatwaveTemp).toLowerCase()} · ${preview.crisis.fanBFault ? `Fan B fails ${hourLabel(TIMELINE.crisisHour)}` : 'all fans running'}`

  return (
    <div className="mb-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
        className="flex items-center gap-2.5 rounded-[14px] bg-white/[0.08] px-3.5 py-2.5 ring-1 ring-transparent transition-shadow focus-within:ring-cyan-400/60"
      >
        <Sparkles size={18} className="shrink-0 text-cyan-300" />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setApplied(null)
          }}
          placeholder="Describe it — e.g. “104°F and the middle fan breaks”"
          aria-label="Describe the crisis in your own words"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-white placeholder:text-slate-500 focus:outline-none"
        />
        {text && (
          <button type="button" onClick={() => setText('')} className="text-slate-500 hover:text-white" aria-label="Clear">
            <X size={16} />
          </button>
        )}
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Apply description"
          className="press grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-400 text-slate-950 disabled:bg-white/10 disabled:text-slate-500"
        >
          <ArrowUp size={16} strokeWidth={2.6} />
        </button>
      </form>
      <AnimatePresence initial={false} mode="wait">
        {preview ? (
          <motion.div key="preview" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING} className="mt-2 px-1 text-[13px]">
            <span className={applied === text ? 'text-emerald-300' : 'text-slate-300'}>
              {applied === text ? <Check size={13} className="mr-1 inline -translate-y-px" /> : 'Reads as: '}
              {summary}
            </span>
            {applied !== text && <span className="text-slate-500"> — press Return to use</span>}
            {preview.notes.map((n) => (
              <div key={n} className="text-amber-200/80">
                {n}
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="hints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[13px] text-slate-500">
            <span>Try:</span>
            {EXAMPLE_PROMPTS.slice(1).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => {
                  setText(p)
                  apply(p)
                }}
                className="text-slate-300 underline decoration-white/20 underline-offset-4 hover:text-white hover:decoration-white/60"
              >
                {p.replace(/[.]$/, '')}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CrisisStep({ onNext }: { onNext: () => void }) {
  const crisis = useSim((s) => s.crisis)
  const setCrisis = useSim((s) => s.setCrisis)
  const base = useSim((s) => s.bundle.doNothing.summary)
  const fill = ((crisis.heatwaveTemp - HEAT_MIN) / (HEAT_MAX - HEAT_MIN)) * 100

  return (
    <>
      <Header eyebrow="Step 1 of 2" title="What goes wrong this week?" subtitle="Type it in a sentence, or set it directly below — they stay in sync." />
      <SmartTranslate />

      <div className="grouped">
        <Row
          icon={
            <IconTile color="orange">
              <Flame size={17} />
            </IconTile>
          }
          title="Heatwave peak"
          subtitle={`${heatWord(crisis.heatwaveTemp)} afternoons for about 5 days`}
          trailing={
            <span className="text-[22px] font-bold tracking-tight text-white">
              <AnimatedNumber value={crisis.heatwaveTemp} />
              °C
            </span>
          }
        >
          <input
            type="range"
            min={HEAT_MIN}
            max={HEAT_MAX}
            value={crisis.heatwaveTemp}
            onChange={(e) => setCrisis({ heatwaveTemp: Number(e.target.value) })}
            aria-label="Heatwave peak temperature"
            className="ios-slider"
            style={{ ['--fill' as string]: `${fill}%`, ['--fill-bg' as string]: 'linear-gradient(90deg,#fbbf24,#f97316,#ef4444)' }}
          />
          <div className="mt-0.5 flex justify-between text-[12px] text-slate-500">
            <span>Warm</span>
            <span>Hot</span>
            <span>Extreme</span>
          </div>
        </Row>
        <Row
          icon={
            <IconTile color={crisis.fanBFault ? 'red' : 'slate'}>
              <motion.span animate={crisis.fanBFault ? { rotate: 0 } : { rotate: 360 }} transition={crisis.fanBFault ? SPRING : { repeat: Infinity, duration: 1.6, ease: 'linear' }} className="grid">
                <Fan size={17} />
              </motion.span>
            </IconTile>
          }
          title="Fan B breaks down"
          subtitle={crisis.fanBFault ? `Centre exhaust fan stops ${hourLabel(TIMELINE.crisisHour)}` : 'All three exhaust fans keep running'}
          trailing={<Switch on={crisis.fanBFault} onChange={(v) => setCrisis({ fanBFault: v })} label="Fan B breaks down" tone="red" />}
          onClick={() => setCrisis({ fanBFault: !crisis.fanBFault })}
        />
        <Row
          icon={
            <IconTile color="purple">
              <Dna size={17} />
            </IconTile>
          }
          title="Two new calves carry BRD"
          subtitle="Always included, so every response is compared fairly"
          trailing={<span className="text-[13px] text-slate-500">Pen 3</span>}
          divider={false}
        />
      </div>

      <div className="mt-5 grid grid-cols-3 divide-x divide-white/[0.08] rounded-[18px] bg-red-500/[0.07] py-3 text-center">
        <div className="col-span-3 -mt-0.5 mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-red-200/70">If nobody acts</div>
        {[
          ['sick', base.clinicalCases, (v: number) => Math.round(v).toString()],
          ['deaths', base.deaths, (v: number) => Math.round(v).toString()],
          ['herd loss', base.cost.total, money],
        ].map(([label, value, fmt]) => (
          <div key={label as string}>
            <div className="text-[24px] font-bold tracking-tight text-white">
              <AnimatedNumber value={value as number} format={fmt as (v: number) => string} />
            </div>
            <div className="text-[12px] text-slate-400">{label as string}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <a href="#/" className="text-[15px] font-medium text-slate-400 hover:text-white">
          Cancel
        </a>
        <button type="button" onClick={onNext} className="press rounded-full bg-white px-6 py-2.5 text-[15px] font-semibold text-slate-950 hover:bg-slate-100">
          Continue
        </button>
      </div>
    </>
  )
}

function ResponseStep({ onBack, onStart }: { onBack: () => void; onStart: () => void }) {
  const bundle = useSim((s) => s.bundle)
  const kind = useSim((s) => s.planKind)
  const plan = useSim((s) => s.plan)
  const setPlan = useSim((s) => s.setPlan)
  const applyRecommendation = useSim((s) => s.applyRecommendation)
  const resetPlan = useSim((s) => s.resetPlan)
  const [choice, setChoice] = useState<Choice>(() => rememberedChoice ?? (kind === 'custom' || kind === 'naive' ? 'own' : 'smart'))
  const [own, setOwn] = useState<InterventionConfig>(kind === 'custom' || kind === 'naive' ? plan : { ...NO_INTERVENTION, isolate: true })

  // First visit: pre-select (and simulate) the recommended plan.
  useEffect(() => {
    if (choice === 'smart' && kind !== 'smart') applyRecommendation()
    if (choice === 'none' && kind !== 'none') resetPlan()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync once on mount
  }, [])

  const base = bundle.doNothing.summary
  const chosen = choice === 'none' ? base : choice === 'smart' ? bundle.smart.summary : bundle.current.summary
  const saved = base.cost.total - chosen.cost.total

  const choose = (c: Choice) => {
    rememberedChoice = c
    setChoice(c)
    if (c === 'smart') applyRecommendation()
    else if (c === 'none') resetPlan()
    else setPlan(own)
  }
  const updateOwn = (patch: Partial<InterventionConfig>) => {
    const next = { ...own, ...patch }
    setOwn(next)
    setPlan(next)
  }
  const check = (c: Choice) => (
    <motion.span initial={false} animate={{ scale: choice === c ? 1 : 0.6, opacity: choice === c ? 1 : 0 }} transition={SPRING} className="text-cyan-300">
      <Check size={20} strokeWidth={2.8} />
    </motion.span>
  )
  const actFill = ((own.actionHour - TIMELINE.crisisHour) / (96 - TIMELINE.crisisHour)) * 100

  return (
    <>
      <Header eyebrow="Step 2 of 2" title="How will you respond?" subtitle="Each choice is simulated across the whole week — pick one to see what it changes." />

      <div className="grouped">
        <Row
          icon={
            <IconTile color="green">
              <Sparkles size={17} />
            </IconTile>
          }
          title={
            <span className="flex items-center gap-2">
              BarnTwin plan
              <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">Recommended</span>
            </span>
          }
          subtitle={`Isolate the sick, fix the airflow, cool, and treat only ${penList(bundle.smart.targetedPens)}`}
          trailing={check('smart')}
          onClick={() => choose('smart')}
        />
        <Row
          icon={
            <IconTile color="slate">
              <Timer size={17} />
            </IconTile>
          }
          title="Do nothing"
          subtitle="Wait, and treat cows only once they look sick"
          trailing={check('none')}
          onClick={() => choose('none')}
        />
        <Row
          icon={
            <IconTile color="cyan">
              <SlidersHorizontal size={17} />
            </IconTile>
          }
          title="Customize"
          subtitle="Choose your own actions and timing"
          trailing={
            <span className="flex items-center gap-2">
              {check('own')}
              <motion.span animate={{ rotate: choice === 'own' ? 180 : 0 }} transition={SPRING} className="text-slate-500">
                <ChevronDown size={18} />
              </motion.span>
            </span>
          }
          onClick={() => choose('own')}
          divider={false}
        />
      </div>

      <AnimatePresence initial={false}>
        {choice === 'own' && (
          <motion.div key="custom" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING} className="overflow-hidden">
            <div className="grouped mt-3">
              {(
                [
                  ['isolate', 'Isolate sick cows', 'Move them to the downwind Hospital Pen', Hospital, 'red'],
                  ['boostVent', 'Boost fans +25%', 'Run the working fans harder', Wind, 'blue'],
                  ['rebalance', 'Rebalance airflow', 'Close Pen 3 baffles, add a portable fan', Fan, 'teal'],
                  ['misters', 'Cooling misters', 'Evaporative cooling at the inlets', Droplets, 'cyan'],
                ] as const
              ).map(([key, title, sub, Icon, color]) => (
                <Row
                  key={key}
                  icon={
                    <IconTile color={color}>
                      <Icon size={17} />
                    </IconTile>
                  }
                  title={title}
                  subtitle={sub}
                  trailing={<Switch on={own[key]} onChange={(v) => updateOwn({ [key]: v })} label={title} />}
                  onClick={() => updateOwn({ [key]: !own[key] })}
                />
              ))}
              <Row
                icon={
                  <IconTile color="purple">
                    <Pill size={17} />
                  </IconTile>
                }
                title="Antibiotics"
                subtitle="Who gets treated"
              >
                <Segmented<AbxStrategy>
                  value={own.abx}
                  onChange={(v) => updateOwn({ abx: v })}
                  options={[
                    { id: 'reactive', label: 'Sick cows' },
                    { id: 'targeted', label: 'Exposed pens' },
                    { id: 'blanket', label: 'Whole barn' },
                  ]}
                />
              </Row>
              <Row
                icon={
                  <IconTile color="orange">
                    <Timer size={17} />
                  </IconTile>
                }
                title="Act at"
                subtitle={`Hour ${own.actionHour} · ${hourLabel(own.actionHour)}${own.actionHour <= TIMELINE.defaultActionHour ? ' — as early as BarnTwin can spot it' : ''}`}
                divider={false}
              >
                <input
                  type="range"
                  min={TIMELINE.crisisHour}
                  max={96}
                  step={2}
                  value={own.actionHour}
                  onChange={(e) => updateOwn({ actionHour: Number(e.target.value) })}
                  aria-label="Hour to act"
                  className="ios-slider"
                  style={{ ['--fill' as string]: `${actFill}%`, ['--fill-bg' as string]: '#22d3ee' }}
                />
              </Row>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`mt-5 rounded-[18px] px-5 py-4 transition-colors duration-300 ${choice === 'none' ? 'bg-red-500/[0.08]' : saved >= 0 ? 'bg-emerald-500/[0.08]' : 'bg-red-500/[0.08]'}`}>
        <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-400">This week, with your choice</div>
        <div className={`mt-1 text-[30px] font-bold tracking-tight ${choice === 'none' || saved < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
          <AnimatedNumber value={choice === 'none' ? chosen.cost.total : Math.abs(saved)} format={money} />{' '}
          <span className="text-[17px] font-semibold text-slate-300">{choice === 'none' ? 'herd loss' : saved >= 0 ? 'saved' : 'extra loss'}</span>
        </div>
        <div className="mt-0.5 text-[14px] text-slate-300">
          <AnimatedNumber value={chosen.clinicalCases} /> sick cows · <AnimatedNumber value={chosen.deaths} /> {chosen.deaths === 1 ? 'death' : 'deaths'} · <AnimatedNumber value={chosen.antibioticDoses} /> antibiotic doses
          {choice !== 'none' && <span className="text-slate-500"> (vs {base.clinicalCases} sick if nobody acts)</span>}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-[15px] font-medium text-slate-400 hover:text-white">
          <ChevronLeft size={18} /> Back
        </button>
        <button
          type="button"
          onClick={onStart}
          className="press flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-2.5 text-[15px] font-semibold text-slate-950 shadow-[0_8px_30px_-6px_rgba(52,211,153,0.6)] hover:bg-emerald-300"
        >
          <Play size={16} fill="currentColor" /> Start simulation
        </button>
      </div>
    </>
  )
}

/** Guided setup: 1) crisis, 2) response, then the clean run page. */
export default function SetupPage() {
  const [step, setStep] = useState<Step>(() => (window.location.hash.includes('response') ? 'response' : 'crisis'))
  const [dir, setDir] = useState(1)
  const startRun = useSim((s) => s.startRun)

  useEffect(() => {
    useSim.setState({ playing: false, hour: 30, selectedPen: null, projectionOpen: false })
  }, [])

  const go = (next: Step) => {
    setDir(next === 'response' ? 1 : -1)
    setStep(next)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full select-none font-sans">
        <div className="absolute inset-0">
          <BarnScene sidePanels={false} />
        </div>
        <div className="absolute inset-0 bg-slate-950/45" />

        <div className="absolute inset-0 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4">
            <a href="#/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-gradient-to-br from-cyan-400 to-emerald-500 font-black text-slate-950">B</div>
              <span className="text-[16px] font-semibold text-white">BarnTwin</span>
            </a>
            <PageDots step={step} />
            <a href="#/lab" className="text-[13px] font-medium text-slate-400 hover:text-white">
              Expert view
            </a>
          </div>

          <div className="flex flex-1 items-start justify-center px-4 pb-10 pt-2 md:items-center">
            <motion.div layout transition={SPRING} className="sheet w-full max-w-[600px] overflow-hidden rounded-[28px] p-7">
              <AnimatePresence mode="popLayout" custom={dir} initial={false}>
                <motion.div key={step} custom={dir} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={SPRING}>
                  {step === 'crisis' ? (
                    <CrisisStep onNext={() => go('response')} />
                  ) : (
                    <ResponseStep
                      onBack={() => go('crisis')}
                      onStart={() => {
                        startRun()
                        window.location.hash = '#/run'
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </MotionConfig>
  )
}
