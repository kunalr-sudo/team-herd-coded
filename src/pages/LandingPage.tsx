import { ArrowRight, BrainCircuit, Dna, Eye, LineChart, Play, ScanEye, Sparkles, Thermometer, TreePine, Wind } from 'lucide-react'
import type { ReactNode } from 'react'
import PastureScene from '../components/canvas/PastureScene'
import { usd } from '../sim/advisor'
import { HERD_SIZE, N_PENS } from '../sim/constants'
import { useSim } from '../store/useSimulationStore'

function Step({ n, icon, title, children }: { n: number; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/15 text-cyan-300">{icon}</div>
        <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-slate-500">Step {n}</div>
      </div>
      <div className="mt-3 text-[18px] font-bold text-slate-50">{title}</div>
      <div className="mt-1 text-[14px] leading-relaxed text-slate-400">{children}</div>
    </div>
  )
}

export default function LandingPage() {
  const bundle = useSim((s) => s.bundle)
  const base = bundle.doNothing.summary
  const smart = bundle.smart.summary
  const blanket = bundle.blanketReference.summary.antibioticDoses
  const hidden36 = bundle.doNothing.frames[36].totals.quiet
  const sick36 = bundle.doNothing.frames[36].totals.sick

  return (
    <div className="h-full overflow-y-auto bg-[#05070b] font-sans text-slate-200">
      {/* Hero */}
      <section className="relative h-[92vh] min-h-[620px] w-full overflow-hidden">
        <div className="absolute inset-0">
          <PastureScene />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#05070b] to-transparent" />

        <nav className="absolute inset-x-0 top-0 flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 font-black text-slate-950">B</div>
            <span className="text-[18px] font-bold tracking-wide text-white">BarnTwin</span>
          </div>
          <div className="flex items-center gap-5 text-[14px] font-semibold">
            <a href="#how" className="text-slate-300 hover:text-white">How it works</a>
            <a href="#/pasture" className="text-slate-300 hover:text-white">Pasture 🐄</a>
            <a href="#/simulate" className="rounded-full bg-white px-4 py-1.5 text-slate-950 hover:bg-cyan-100">Launch simulation</a>
          </div>
        </nav>

        <div className="relative flex h-full max-w-[680px] flex-col justify-center px-8 md:px-14">
          <div className="text-[12px] font-bold uppercase tracking-[0.25em] text-emerald-300">Digital twin for cattle barns</div>
          <h1 className="mt-3 text-[54px] font-black leading-[1.03] text-white">
            See the outbreak
            <br />
            before the herd does.
          </h1>
          <p className="mt-5 text-[18px] leading-relaxed text-slate-300">
            BarnTwin is a live 3D model of your barn. It tracks how air, heat and ammonia move through every pen. From that it predicts where
            <b className="text-white"> Bovine Respiratory Disease</b> is spreading <b className="text-white">before any cow looks sick</b>, then tells you exactly what to do.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#/simulate"
              className="flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-[16px] font-bold text-slate-950 shadow-[0_0_30px_rgba(52,211,153,0.45)] hover:bg-emerald-300"
            >
              <Play size={18} /> Launch the barn simulation
            </a>
            <a href="#/pasture" className="flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-[16px] font-semibold text-white hover:bg-white/10">
              <TreePine size={18} /> Visit the pasture
            </a>
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className="mx-auto max-w-[1100px] px-8 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-red-300">The problem</div>
            <h2 className="mt-2 text-[34px] font-extrabold leading-tight text-white">By the time a cow coughs, the barn is already infected.</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-slate-400">
              BRD incubates silently for 36–72 hours. In a heatwave, one broken fan is enough to create a pocket of hot, stale air. Cows bunch together and the
              swirling air carries germs into the next pens. The farmer sees a couple of sick calves. The rest of the barn looks fine.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 self-center">
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
              <Eye className="text-slate-400" />
              <div className="mt-2 text-[13px] font-bold uppercase tracking-[0.14em] text-slate-500">Farmer's eye · Hour 36</div>
              <div className="text-[40px] font-black text-white">{sick36}</div>
              <div className="text-[14px] text-slate-400">cows look sick</div>
            </div>
            <div className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-5">
              <ScanEye className="text-yellow-300" />
              <div className="mt-2 text-[13px] font-bold uppercase tracking-[0.14em] text-yellow-200/80">BarnTwin X-Ray · Hour 36</div>
              <div className="text-[40px] font-black text-yellow-300">{sick36 + hidden36}</div>
              <div className="text-[14px] text-yellow-100/80">are already infected</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-[1100px] px-8 pb-16">
        <div className="text-[12px] font-bold uppercase tracking-[0.2em] text-cyan-300">What BarnTwin does</div>
        <h2 className="mt-2 text-[34px] font-extrabold text-white">More than a climate controller.</h2>
        <p className="mt-3 max-w-[760px] text-[16px] text-slate-400">
          A climate controller reacts to temperature. BarnTwin connects <b className="text-slate-200">climate → disease → money</b>. It explains why the air is
          making cows sick, and which fix pays off.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Step n={1} icon={<Thermometer size={20} />} title="Senses the barn">
            Temperature, humidity, ammonia and airflow in every pen, plus fan status.
          </Step>
          <Step n={2} icon={<Wind size={20} />} title="Simulates air & disease">
            Air physics coupled to a {HERD_SIZE}-cow infection model, run 7 days ahead in milliseconds.
          </Step>
          <Step n={3} icon={<Dna size={20} />} title="Reveals hidden infections">
            AI X-Ray shows cows that are infected but not yet sick, about 48 h before symptoms.
          </Step>
          <Step n={4} icon={<Sparkles size={20} />} title="Recommends & proves the fix">
            Isolate, rebalance the air, cool, and treat only exposed pens. Every option is priced in dollars, deaths and antibiotic doses.
          </Step>
        </div>
      </section>

      {/* Results */}
      <section className="border-y border-slate-800 bg-slate-950/60">
        <div className="mx-auto max-w-[1100px] px-8 py-14">
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-emerald-300">
            <LineChart size={14} /> Live from the model · 38 °C heatwave + one failed fan
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              ['Sick cattle', `${base.clinicalCases} → ${smart.clinicalCases}`],
              ['Deaths', `${base.deaths} → ${smart.deaths}`],
              ['Herd loss prevented', usd(base.cost.total - smart.cost.total)],
              ['Fewer antibiotic doses', `${Math.round((1 - smart.antibioticDoses / blanket) * 100)}%`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div className="text-[13px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
                <div className="mt-1 text-[34px] font-black text-emerald-300">{value}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-slate-500">
            {HERD_SIZE}-head barn, {N_PENS - 1} pens of 20 plus a Hospital Pen. "Do nothing" vs the BarnTwin recommendation over 7 days. Antibiotic doses are compared against
            blanket-treating the whole barn.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto flex max-w-[1100px] flex-col items-center px-8 py-16 text-center">
        <BrainCircuit size={36} className="text-cyan-300" />
        <h2 className="mt-3 text-[30px] font-extrabold text-white">Try it: break a fan, watch the spread, fix it.</h2>
        <p className="mt-2 max-w-[640px] text-[15px] text-slate-400">
          The simulation walks you through four steps: crisis → hidden spread → why the obvious fix fails → the BarnTwin fix. Every control updates the 7-day
          projection instantly.
        </p>
        <a href="#/simulate" className="mt-6 flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[16px] font-bold text-slate-950 hover:bg-cyan-100">
          Launch the simulation <ArrowRight size={18} />
        </a>
      </section>
    </div>
  )
}
