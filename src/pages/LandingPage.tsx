import { MotionConfig, motion, useInView } from 'motion/react'
import { ArrowRight, Check, ChevronDown, Dna, Minus, Play, ScanEye, Sparkles, Thermometer, Wind } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import PastureScene from '../components/canvas/PastureScene'
import { AnimatedNumber, IconTile } from '../components/ui/controls'
import { HERD_SIZE } from '../sim/constants'
import { useSim } from '../store/useSimulationStore'

const money = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`

/** Fades content up once as it scrolls into view. */
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.7, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Counts up from zero the first time it becomes visible. */
function CountUp({ value, format }: { value: number; format?: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  return (
    <span ref={ref}>
      <AnimatedNumber value={inView ? value : 0} format={format} />
    </span>
  )
}

function Eyebrow({ children, tone = 'text-cyan-300' }: { children: ReactNode; tone?: string }) {
  return <div className={`text-[15px] font-semibold ${tone}`}>{children}</div>
}

const H2 = ({ children }: { children: ReactNode }) => <h2 className="display-title mt-2 text-[44px] font-bold text-white md:text-[52px]">{children}</h2>

export default function LandingPage() {
  const bundle = useSim((s) => s.bundle)
  const base = bundle.doNothing.summary
  const smart = bundle.smart.summary
  const blanket = bundle.blanketReference.summary.antibioticDoses
  const hidden36 = bundle.doNothing.frames[36].totals.quiet
  const sick36 = bundle.doNothing.frames[36].totals.sick
  const [scrolled, setScrolled] = useState(false)
  const howRef = useRef<HTMLElement>(null)

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-full overflow-y-auto bg-[#05070b] font-sans text-slate-200" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 40)}>
        {/* Nav: transparent over the hero, becomes a glass bar once you scroll. */}
        <nav
          className={`sticky top-0 z-30 transition-[background-color,border-color,backdrop-filter] duration-300 ${
            scrolled ? 'border-b border-white/[0.07] bg-[#0a0d14]/70 backdrop-blur-xl backdrop-saturate-150' : 'border-b border-transparent'
          }`}
        >
          <div className="mx-auto flex h-[56px] max-w-[1120px] items-center justify-between px-6">
            <a href="#/" className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-[9px] bg-gradient-to-br from-cyan-400 to-emerald-500 text-[15px] font-black text-slate-950">B</div>
              <span className="text-[16px] font-semibold text-white">BarnTwin</span>
            </a>
            <div className="flex items-center gap-1 text-[14px]">
              <button type="button" onClick={() => howRef.current?.scrollIntoView({ behavior: 'smooth' })} className="press rounded-full px-3 py-1.5 text-slate-200 hover:text-white">
                How it works
              </button>
              <a href="#/pasture" className="press rounded-full px-3 py-1.5 text-slate-200 hover:text-white">
                Pasture
              </a>
              <a href="#/simulate" className="press ml-2 rounded-full bg-white px-4 py-1.5 font-semibold text-slate-950 hover:bg-slate-100">
                Try it
              </a>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative -mt-[56px] h-[100svh] min-h-[640px] w-full overflow-hidden">
          <div className="absolute inset-0">
            <PastureScene />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(5,7,11,0.72)_0%,rgba(5,7,11,0.45)_45%,rgba(5,7,11,0.1)_75%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#05070b]/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#05070b] to-transparent" />

          <div className="pointer-events-none relative flex h-full flex-col items-center justify-center px-6 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.9 }}>
              <Eyebrow tone="text-emerald-300">A digital twin for cattle barns</Eyebrow>
              <h1 className="mx-auto mt-3 max-w-[900px] text-[56px] font-bold leading-[1.02] tracking-[-0.035em] text-white md:text-[76px]">See the outbreak before the herd does.</h1>
              <p className="mx-auto mt-6 max-w-[640px] text-[19px] leading-relaxed text-slate-200 md:text-[21px]">
                BarnTwin models how air, heat and ammonia move through your barn — and predicts where respiratory disease is spreading before any cow looks sick.
              </p>
              <div className="pointer-events-auto mt-9 flex flex-wrap items-center justify-center gap-5">
                <a href="#/simulate" className="press flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[17px] font-semibold text-slate-950 shadow-[0_10px_40px_-10px_rgba(255,255,255,0.45)] hover:bg-slate-100">
                  <Play size={17} fill="currentColor" /> Try the simulation
                </a>
                <a href="#/pasture" className="group flex items-center gap-1 text-[17px] font-medium text-cyan-200 hover:text-white">
                  Visit the pasture <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </motion.div>
          </div>
          <button
            type="button"
            onClick={() => howRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute bottom-7 left-1/2 -translate-x-1/2 text-slate-400 hover:text-white"
            aria-label="Scroll to learn more"
          >
            <ChevronDown size={26} className="animate-bounce" />
          </button>
        </section>

        {/* The problem */}
        <section className="mx-auto max-w-[1120px] px-6 py-28">
          <div className="grid items-center gap-14 md:grid-cols-[1.1fr_1fr]">
            <Reveal>
              <Eyebrow tone="text-red-300">The problem</Eyebrow>
              <H2>By the time a cow coughs, the barn is already infected.</H2>
              <p className="mt-5 text-[19px] leading-relaxed text-slate-400">
                Bovine respiratory disease incubates silently for 36–72 hours. In a heatwave, one broken fan creates a pocket of hot, stale air — cows bunch together, and
                swirling air carries germs into the next pens.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="grid grid-cols-2 gap-3">
                <div className="grouped rounded-[24px] p-6">
                  <div className="text-[14px] font-medium text-slate-400">The farmer sees</div>
                  <div className="mt-2 text-[64px] font-bold leading-none tracking-tight text-white">
                    <CountUp value={sick36} />
                  </div>
                  <div className="mt-2 text-[15px] text-slate-400">sick calves at hour 36</div>
                </div>
                <div className="rounded-[24px] bg-yellow-300/[0.09] p-6 ring-1 ring-yellow-300/25">
                  <div className="flex items-center gap-1.5 text-[14px] font-medium text-yellow-200">
                    <ScanEye size={15} /> BarnTwin sees
                  </div>
                  <div className="mt-2 text-[64px] font-bold leading-none tracking-tight text-yellow-200">
                    <CountUp value={sick36 + hidden36} />
                  </div>
                  <div className="mt-2 text-[15px] text-yellow-100/70">already infected</div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section ref={howRef} className="scroll-mt-16 border-t border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto max-w-[1120px] px-6 py-28">
            <Reveal className="max-w-[760px]">
              <Eyebrow>How it works</Eyebrow>
              <H2>From barn air to a decision, in milliseconds.</H2>
            </Reveal>
            <div className="mt-12 grid gap-4 md:grid-cols-4">
              {(
                [
                  ['orange', Thermometer, 'Senses', 'Temperature, humidity, ammonia and airflow in every pen, plus which fans are running.'],
                  ['blue', Wind, 'Simulates', `Air physics coupled to a ${HERD_SIZE}-cow infection model, projected a full week ahead.`],
                  ['purple', Dna, 'Reveals', 'An X-Ray view of cows that are infected but not yet sick — about 48 hours early.'],
                  ['green', Sparkles, 'Recommends', 'Isolate, fix the air, cool, and treat only the exposed pens — each option priced out.'],
                ] as const
              ).map(([color, Icon, title, body], i) => (
                <Reveal key={title} delay={i * 0.07}>
                  <div className="grouped h-full rounded-[24px] p-6">
                    <IconTile color={color}>
                      <Icon size={17} />
                    </IconTile>
                    <div className="mt-5 text-[20px] font-semibold tracking-tight text-white">{title}</div>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-slate-400">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Not a climate controller */}
        <section className="mx-auto max-w-[1120px] px-6 py-28">
          <Reveal className="max-w-[760px]">
            <Eyebrow>Why it's different</Eyebrow>
            <H2>More than a climate controller.</H2>
            <p className="mt-5 text-[19px] leading-relaxed text-slate-400">A controller reacts to temperature. BarnTwin connects climate to disease to dollars — so you know which fix actually pays off.</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: 'Climate controller',
                  good: false,
                  items: ['Reacts to one barn-wide temperature', 'Turns fans up or down', 'Blind to infection until cows look sick', 'No idea what a decision costs'],
                },
                {
                  title: 'BarnTwin',
                  good: true,
                  items: ['Models air, heat and ammonia in every pen', 'Shows how a dead fan spreads germs', 'Spots silent infections ~48 h early', 'Prices every option in dollars, deaths and doses'],
                },
              ].map((col) => (
                <div key={col.title} className={`rounded-[24px] p-7 ${col.good ? 'bg-emerald-400/[0.07] ring-1 ring-emerald-300/20' : 'grouped'}`}>
                  <div className={`text-[20px] font-semibold tracking-tight ${col.good ? 'text-emerald-200' : 'text-slate-300'}`}>{col.title}</div>
                  <ul className="mt-4 space-y-3">
                    {col.items.map((it) => (
                      <li key={it} className="flex items-start gap-3 text-[16px] text-slate-300">
                        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${col.good ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-slate-500'}`}>
                          {col.good ? <Check size={13} strokeWidth={3} /> : <Minus size={13} strokeWidth={3} />}
                        </span>
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Results */}
        <section className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto max-w-[1120px] px-6 py-28">
            <Reveal className="max-w-[760px]">
              <Eyebrow tone="text-emerald-300">Results from the model</Eyebrow>
              <H2>One heatwave. One failed fan. One week.</H2>
              <p className="mt-5 text-[19px] leading-relaxed text-slate-400">
                A {HERD_SIZE}-head barn at a 38 °C peak — doing nothing versus following BarnTwin's plan.
              </p>
            </Reveal>
            <div className="mt-12 grid gap-4 md:grid-cols-4">
              {[
                { label: 'Fewer sick cattle', value: base.clinicalCases - smart.clinicalCases, sub: `${base.clinicalCases} → ${smart.clinicalCases}` },
                { label: 'Deaths avoided', value: base.deaths - smart.deaths, sub: `${base.deaths} → ${smart.deaths}` },
                { label: 'Herd loss prevented', value: base.cost.total - smart.cost.total, sub: 'over 7 days', fmt: money },
                { label: 'Fewer antibiotic doses', value: Math.round((1 - smart.antibioticDoses / blanket) * 100), sub: 'vs treating the whole barn', fmt: (v: number) => `${Math.round(v)}%` },
              ].map((r, i) => (
                <Reveal key={r.label} delay={i * 0.07}>
                  <div className="grouped h-full rounded-[24px] p-6">
                    <div className="text-[44px] font-bold leading-none tracking-tight text-emerald-300">
                      <CountUp value={r.value} format={r.fmt} />
                    </div>
                    <div className="mt-3 text-[16px] font-semibold text-white">{r.label}</div>
                    <div className="text-[14px] text-slate-500">{r.sub}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto flex max-w-[1120px] flex-col items-center px-6 py-32 text-center">
          <Reveal>
            <H2>Break a fan. Watch it spread. Fix it.</H2>
            <p className="mx-auto mt-5 max-w-[620px] text-[19px] leading-relaxed text-slate-400">
              Describe a crisis, choose how to respond, and watch the week play out — every choice is simulated the moment you make it.
            </p>
            <a href="#/simulate" className="press mx-auto mt-9 flex w-fit items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[17px] font-semibold text-slate-950 hover:bg-slate-100">
              <Play size={17} fill="currentColor" /> Try the simulation
            </a>
          </Reveal>
        </section>

        <footer className="border-t border-white/[0.06]">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-6 py-6 text-[13px] text-slate-500">
            <span>BarnTwin — a hackathon prototype. Model results are illustrative, not veterinary advice.</span>
            <span className="flex gap-4">
              <a href="#/lab" className="hover:text-slate-300">
                Expert view
              </a>
              <a href="#/pasture" className="hover:text-slate-300">
                Pasture
              </a>
            </span>
          </div>
        </footer>
      </div>
    </MotionConfig>
  )
}
