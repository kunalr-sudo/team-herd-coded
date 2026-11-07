import { LineChart, Pencil, RotateCcw, SlidersHorizontal } from 'lucide-react'
import BarnScene from '../components/canvas/BarnScene'
import CowLegend from '../components/hud/CowLegend'
import ProjectionOverlay from '../components/hud/ProjectionOverlay'
import { StoryBanner, XRayToggle } from '../components/hud/StoryStepper'
import TimelineBar from '../components/hud/TimelineBar'
import { PLAN_NAME } from '../components/hud/projectionData'
import { usd } from '../sim/advisor'
import { HOURS } from '../sim/constants'
import { useSim } from '../store/useSimulationStore'

const RUN_PLAN_NAME = { ...PLAN_NAME, none: 'No intervention' }

function ScenarioChip() {
  const crisis = useSim((s) => s.crisis)
  const kind = useSim((s) => s.planKind)
  return (
    <div className="panel flex items-center gap-3 px-3 py-2">
      <a href="#/" title="BarnTwin home" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-500 font-black text-slate-950">
        B
      </a>
      <div className="leading-tight">
        <div className="text-[12.5px] font-semibold text-slate-100">
          {crisis.heatwaveTemp}°C heatwave{crisis.fanBFault ? ' · Fan B fails' : ' · all fans OK'}
        </div>
        <div className="text-[11.5px] text-slate-400">Response: {RUN_PLAN_NAME[kind]}</div>
      </div>
      <a href="#/simulate" className="flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-[11.5px] font-semibold text-slate-200 hover:border-cyan-400" title="Change the crisis or response">
        <Pencil size={12} /> Change
      </a>
    </div>
  )
}

function ProjectionButton() {
  const bundle = useSim((s) => s.bundle)
  const kind = useSim((s) => s.planKind)
  const open = useSim((s) => s.setProjectionOpen)
  const base = bundle.doNothing.summary
  const p = bundle.current.summary
  const saved = base.cost.total - p.cost.total
  return (
    <button type="button" onClick={() => open(true)} className="panel flex items-center gap-2 px-3 py-2 text-left hover:border-cyan-400/70" title="Open the 7-day projection">
      <LineChart size={18} className="text-cyan-300" />
      <div className="leading-tight">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">7-day projection</div>
        <div className={`text-[13px] font-bold ${kind === 'none' ? 'text-slate-100' : saved >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
          {kind === 'none' ? `${p.clinicalCases} sick · ${usd(p.cost.total)} loss` : saved >= 0 ? `${usd(saved)} saved` : `${usd(-saved)} extra loss`}
        </div>
      </div>
    </button>
  )
}

function WeekComplete() {
  const hour = useSim((s) => s.hour)
  const playing = useSim((s) => s.playing)
  const bundle = useSim((s) => s.bundle)
  const kind = useSim((s) => s.planKind)
  const startRun = useSim((s) => s.startRun)
  const openProjection = useSim((s) => s.setProjectionOpen)
  if (hour < HOURS || playing) return null
  const base = bundle.doNothing.summary
  const p = bundle.current.summary
  const saved = base.cost.total - p.cost.total
  return (
    <div className="pointer-events-auto absolute left-1/2 top-1/2 z-20 w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-600/60 bg-slate-950/92 p-5 text-center shadow-2xl backdrop-blur">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">Week complete · {RUN_PLAN_NAME[kind]}</div>
      <div className="mt-2 text-[22px] font-extrabold text-white">
        {p.clinicalCases} sick · {p.deaths} {p.deaths === 1 ? 'death' : 'deaths'}
      </div>
      <div className={`text-[15px] font-semibold ${kind === 'none' ? 'text-red-300' : saved >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
        {kind === 'none'
          ? `${usd(p.cost.total)} herd loss — BarnTwin would have saved ${usd(base.cost.total - bundle.smart.summary.cost.total)}`
          : saved >= 0
            ? `${usd(saved)} saved vs doing nothing`
            : `${usd(-saved)} more lost than doing nothing`}
      </div>
      <div className="mt-4 flex justify-center gap-2 whitespace-nowrap">
        <button type="button" onClick={() => openProjection(true)} className="rounded-lg bg-white px-3 py-2 text-[13px] font-bold text-slate-950 hover:bg-cyan-100">
          See full projection
        </button>
        <a href="#/simulate/response" className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-[13px] font-semibold text-slate-200 hover:border-cyan-400">
          <SlidersHorizontal size={14} /> Try another response
        </a>
        <button type="button" onClick={startRun} className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-[13px] font-semibold text-slate-200 hover:border-cyan-400">
          <RotateCcw size={14} /> Replay
        </button>
      </div>
    </div>
  )
}

/** Clean simulation view: the barn, the narration and the timeline — no control parameters. */
export default function RunPage() {
  return (
    <div className="relative h-full w-full select-none font-sans">
      <div className="absolute inset-0">
        <BarnScene sidePanels={false} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start gap-3 p-3">
        <div className="pointer-events-auto shrink-0">
          <ScenarioChip />
        </div>
        <div className="pointer-events-auto min-w-0 flex-1">
          <StoryBanner />
        </div>
        <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-2">
          <XRayToggle />
          <div className="flex items-center gap-2">
            <a href="#/lab" className="text-[11.5px] font-semibold text-slate-300 drop-shadow hover:text-white" title="All controls and the guided demo">
              Expert view
            </a>
            <ProjectionButton />
          </div>
        </div>
      </div>
      <WeekComplete />
      <CowLegend />
      <TimelineBar />
      <ProjectionOverlay />
    </div>
  )
}
