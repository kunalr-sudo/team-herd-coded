import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { ChartLine, RotateCcw, SlidersHorizontal, Wrench } from 'lucide-react'
import BarnScene from '../components/canvas/BarnScene'
import CowLegend from '../components/hud/CowLegend'
import ProjectionOverlay from '../components/hud/ProjectionOverlay'
import { StoryBanner, XRayToggle } from '../components/hud/StoryStepper'
import TimelineBar from '../components/hud/TimelineBar'
import { PLAN_NAME } from '../components/hud/projectionData'
import { SPRING } from '../components/ui/spring'
import { usd } from '../sim/advisor'
import { HOURS } from '../sim/constants'
import { useSim } from '../store/useSimulationStore'

const RUN_PLAN_NAME = { ...PLAN_NAME, none: 'No intervention' }

/** Single toolbar: where am I (scenario), how to change it, view toggle, and the projection. */
function Toolbar() {
  const crisis = useSim((s) => s.crisis)
  const kind = useSim((s) => s.planKind)
  const bundle = useSim((s) => s.bundle)
  const openProjection = useSim((s) => s.setProjectionOpen)
  const base = bundle.doNothing.summary
  const p = bundle.current.summary
  const saved = base.cost.total - p.cost.total

  return (
    <div className="pointer-events-auto flex w-full items-center gap-3">
      <div className="panel flex min-w-0 items-center gap-3 py-2 pl-2 pr-2">
        <a href="#/" title="BarnTwin home" className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-cyan-400 to-emerald-500 font-black text-slate-950">
          B
        </a>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[14px] font-semibold text-white">
            {crisis.heatwaveTemp}°C heatwave{crisis.fanBFault ? ' · Fan B fails' : ' · fans OK'}
          </div>
          <div className="truncate text-[12.5px] text-slate-400">{RUN_PLAN_NAME[kind]}</div>
        </div>
        <a href="#/simulate" className="press flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-white/15">
          <SlidersHorizontal size={14} /> Change
        </a>
      </div>

      <div className="flex-1" />
      <XRayToggle />
      <div className="flex-1" />

      <button
        type="button"
        onClick={() => openProjection(true)}
        className="panel press flex shrink-0 items-center gap-2.5 py-2 pl-3 pr-4 text-left hover:bg-white/[0.04]"
        title="Open the 7-day projection"
      >
        <ChartLine size={18} className="text-cyan-300" />
        <div className="leading-tight">
          <div className="text-[12px] text-slate-400">7-day projection</div>
          <div className={`text-[14px] font-semibold ${kind === 'none' ? 'text-white' : saved >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {kind === 'none' ? `${p.clinicalCases} sick · ${usd(p.cost.total)} lost` : saved >= 0 ? `${usd(saved)} saved` : `${usd(-saved)} extra loss`}
          </div>
        </div>
      </button>
      <a href="#/lab" title="Expert view: every control and the guided demo" className="panel press grid h-[52px] w-[52px] shrink-0 place-items-center text-slate-300 hover:text-white">
        <Wrench size={18} />
      </a>
    </div>
  )
}

function WeekComplete() {
  const hour = useSim((s) => s.hour)
  const playing = useSim((s) => s.playing)
  const bundle = useSim((s) => s.bundle)
  const kind = useSim((s) => s.planKind)
  const startRun = useSim((s) => s.startRun)
  const openProjection = useSim((s) => s.setProjectionOpen)
  const show = hour >= HOURS && !playing
  const base = bundle.doNothing.summary
  const p = bundle.current.summary
  const saved = base.cost.total - p.cost.total
  const smartSaves = base.cost.total - bundle.smart.summary.cost.total

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={SPRING}
          className="sheet pointer-events-auto absolute left-1/2 top-1/2 z-20 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] p-7 text-center"
          role="dialog"
          aria-label="Week complete"
        >
          <div className="text-[13px] font-medium text-slate-400">Week complete · {RUN_PLAN_NAME[kind]}</div>
          <div className="display-title mt-2 text-[34px] font-bold text-white">
            {p.clinicalCases} sick · {p.deaths} {p.deaths === 1 ? 'death' : 'deaths'}
          </div>
          <div className={`mt-1 text-[16px] font-medium ${kind === 'none' || saved < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
            {kind === 'none'
              ? `${usd(p.cost.total)} lost — BarnTwin would have saved ${usd(smartSaves)}`
              : saved >= 0
                ? `${usd(saved)} saved compared with doing nothing`
                : `${usd(-saved)} more lost than doing nothing`}
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <button type="button" onClick={() => openProjection(true)} className="press rounded-full bg-white py-3 text-[15px] font-semibold text-slate-950 hover:bg-slate-100">
              See the full projection
            </button>
            <div className="grid grid-cols-2 gap-2">
              <a href="#/simulate/response" className="press flex items-center justify-center gap-1.5 rounded-full bg-white/10 py-2.5 text-[14px] font-medium text-white hover:bg-white/15">
                <SlidersHorizontal size={15} /> Try another response
              </a>
              <button type="button" onClick={startRun} className="press flex items-center justify-center gap-1.5 rounded-full bg-white/10 py-2.5 text-[14px] font-medium text-white hover:bg-white/15">
                <RotateCcw size={15} /> Replay
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Clean simulation view: the barn, the narration and the timeline — no control parameters. */
export default function RunPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative h-full w-full select-none font-sans">
        <div className="absolute inset-0">
          <BarnScene sidePanels={false} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 p-3">
          <Toolbar />
          <div className="pointer-events-auto w-full max-w-[820px]">
            <StoryBanner />
          </div>
        </div>
        <WeekComplete />
        <CowLegend />
        <TimelineBar />
        <ProjectionOverlay />
      </div>
    </MotionConfig>
  )
}
