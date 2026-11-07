import { create } from 'zustand'
import { HOURS, TIMELINE } from '../sim/constants'
import type { LightingMode } from '../sim/daylight'
import {
  NAIVE_FIX,
  NO_INTERVENTION,
  SMART_PROTOCOL,
  classifyPlan,
  runCounterfactuals,
  type CounterfactualBundle,
  type CrisisConfig,
  type InterventionConfig,
  type PlanKind,
} from '../sim/cattleEngine'

export type HeatmapMode = 'none' | 'germ' | 'heat' | 'ammonia'
export type PresetId = 1 | 2 | 3 | 4

export const SPEEDS = [2, 6, 12] as const

interface SimState {
  hour: number
  playing: boolean
  speed: (typeof SPEEDS)[number]
  xray: boolean
  heatmap: HeatmapMode
  selectedPen: number | null
  preset: PresetId | null
  crisis: CrisisConfig
  plan: InterventionConfig
  planKind: PlanKind
  bundle: CounterfactualBundle
  lighting: LightingMode
  controlsOpen: boolean
  insightsOpen: boolean
  projectionOpen: boolean
  /** Timestamp of the last crisis/plan change (drives the "projection updated" feedback). */
  changedAt: number
  setHour: (h: number) => void
  advance: (dh: number) => void
  togglePlay: () => void
  cycleSpeed: () => void
  setXray: (on: boolean) => void
  setHeatmap: (m: HeatmapMode) => void
  selectPen: (p: number | null) => void
  setCrisis: (c: Partial<CrisisConfig>) => void
  setPlan: (p: Partial<InterventionConfig>) => void
  applyPreset: (id: PresetId) => void
  applyRecommendation: () => void
  resetPlan: () => void
  setLighting: (m: LightingMode) => void
  toggleControls: () => void
  toggleInsights: () => void
  setProjectionOpen: (open: boolean) => void
  /** Rewind to Hour 0 and play the chosen scenario from the start. */
  startRun: () => void
}

const DEFAULT_CRISIS: CrisisConfig = { heatwaveTemp: 38, fanBFault: true }

function compute(crisis: CrisisConfig, plan: InterventionConfig) {
  return { bundle: runCounterfactuals(crisis, plan), planKind: classifyPlan(plan) }
}

const initial = compute(DEFAULT_CRISIS, NO_INTERVENTION)

const clampHour = (h: number) => Math.min(HOURS, Math.max(0, h))

export const useSim = create<SimState>((set, get) => ({
  hour: TIMELINE.crisisHour + 6,
  playing: false,
  speed: 6,
  xray: false,
  heatmap: 'none',
  selectedPen: null,
  preset: null,
  crisis: DEFAULT_CRISIS,
  plan: NO_INTERVENTION,
  ...initial,
  lighting: 'auto',
  controlsOpen: true,
  insightsOpen: true,
  projectionOpen: false,
  changedAt: 0,

  setHour: (h) => set({ hour: clampHour(Math.round(h)), preset: null }),
  advance: (dh) => {
    const next = get().hour + dh
    if (next >= HOURS) set({ hour: HOURS, playing: false })
    else set({ hour: next })
  },
  togglePlay: () => {
    const { playing, hour } = get()
    set({ playing: !playing, hour: !playing && hour >= HOURS ? 0 : hour })
  },
  cycleSpeed: () => {
    const i = SPEEDS.indexOf(get().speed)
    set({ speed: SPEEDS[(i + 1) % SPEEDS.length] })
  },
  setXray: (on) => set({ xray: on, heatmap: !on && get().heatmap === 'germ' ? 'heat' : get().heatmap }),
  setHeatmap: (m) => set({ heatmap: m, xray: m === 'germ' ? true : get().xray }),
  selectPen: (p) => set({ selectedPen: p }),
  setCrisis: (c) => {
    const crisis = { ...get().crisis, ...c }
    set({ crisis, preset: null, changedAt: Date.now(), ...compute(crisis, get().plan) })
  },
  setPlan: (p) => {
    const plan = { ...get().plan, ...p }
    set({ plan, preset: null, changedAt: Date.now(), ...compute(get().crisis, plan) })
  },
  applyPreset: (id) => {
    const crisis = DEFAULT_CRISIS
    const actionHour = get().plan.actionHour
    const plans: Record<PresetId, InterventionConfig> = {
      1: { ...NO_INTERVENTION, actionHour },
      2: { ...NO_INTERVENTION, actionHour },
      3: { ...NAIVE_FIX, actionHour },
      4: { ...SMART_PROTOCOL, actionHour },
    }
    const view: Record<PresetId, { hour: number; xray: boolean; heatmap: HeatmapMode }> = {
      1: { hour: TIMELINE.crisisHour, xray: false, heatmap: 'heat' },
      2: { hour: 36, xray: true, heatmap: 'germ' },
      3: { hour: 72, xray: true, heatmap: 'germ' },
      4: { hour: 72, xray: true, heatmap: 'germ' },
    }
    const plan = plans[id]
    set({ crisis, plan, preset: id, playing: false, selectedPen: null, changedAt: Date.now(), ...view[id], ...compute(crisis, plan) })
  },
  applyRecommendation: () => {
    const plan = { ...SMART_PROTOCOL, actionHour: get().plan.actionHour }
    set({ plan, preset: null, changedAt: Date.now(), ...compute(get().crisis, plan) })
  },
  resetPlan: () => {
    const plan = { ...NO_INTERVENTION, actionHour: get().plan.actionHour }
    set({ plan, preset: null, changedAt: Date.now(), ...compute(get().crisis, plan) })
  },
  setLighting: (m) => set({ lighting: m }),
  toggleControls: () => set({ controlsOpen: !get().controlsOpen }),
  toggleInsights: () => set({ insightsOpen: !get().insightsOpen }),
  setProjectionOpen: (open) => set({ projectionOpen: open }),
  startRun: () => set({ hour: 0, playing: true, preset: null, selectedPen: null, projectionOpen: false }),
}))

// Warm the JIT and the flow-field cache shortly after first paint so the first
// intervention click is already in the fast (~10 ms) regime.
if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    for (let k = 0; k < 10; k++) {
      runCounterfactuals(DEFAULT_CRISIS, {
        ...SMART_PROTOCOL,
        misters: k % 2 === 0,
        isolate: k % 3 !== 0,
        rebalance: k % 4 !== 0,
        abx: k % 5 === 0 ? 'blanket' : 'targeted',
      })
    }
  }, 400)
}
