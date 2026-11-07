// Coupled 160-cow BRD agent engine + counterfactual calculator.
//
// Every cow receives fixed, pre-drawn random numbers (infection threshold,
// incubation length, clinical/mortality/chronic draws). All trajectories reuse the
// same draws ("common random numbers"), so differences between Do Nothing, Naive
// Fix and BarnTwin Smart Protocol come only from physics and interventions.

import {
  AMMONIA,
  BRD,
  COWS_PER_PEN,
  CELL_M,
  ECON,
  HEAT,
  HERD_SIZE,
  HOSPITAL,
  HOURS,
  N_CELLS,
  N_PENS,
  PEN_CELLS,
  PENS,
  TIMELINE,
  VENT,
  saturationVaporPressureKPa,
  thiAdjusted,
  thiNRC,
} from './constants'
import { getFlowField, outdoorWeather, type FlowField, type VentConfig, type Weather } from './physicsGrid'

export const S = 0 // Healthy
export const E = 1 // Quietly infected (incubating, may shed)
export const I = 2 // Visibly sick
export const P = 3 // Treated & protected
export const R = 4 // Recovered subclinically (looks healthy)
export const D = 5 // Dead

export type AbxStrategy = 'reactive' | 'blanket' | 'targeted'

export interface CrisisConfig {
  heatwaveTemp: number
  fanBFault: boolean
}

export interface InterventionConfig {
  isolate: boolean
  /** Extra fan speed on the working fans, 0–100 %. */
  fanBoostPct: number
  rebalance: boolean
  /** Cooling mister intensity, 0–100 %. */
  misterPct: number
  abx: AbxStrategy
  actionHour: number
}

export type ScenarioConfig = CrisisConfig & InterventionConfig

export const NO_INTERVENTION: InterventionConfig = {
  isolate: false,
  fanBoostPct: 0,
  rebalance: false,
  misterPct: 0,
  abx: 'reactive',
  actionHour: TIMELINE.defaultActionHour,
}

export const NAIVE_FIX: InterventionConfig = { ...NO_INTERVENTION, fanBoostPct: 25 }

export const SMART_PROTOCOL: InterventionConfig = {
  isolate: true,
  fanBoostPct: 25,
  rebalance: true,
  misterPct: 100,
  abx: 'targeted',
  actionHour: TIMELINE.defaultActionHour,
}

export interface PenStat {
  tempC: number
  rh: number
  thiRaw: number
  thi: number
  nh3: number
  wind: number
  aerosol: number
  bunch: number
  healthy: number
  quiet: number
  sick: number
  protectedCount: number
  recovered: number
  dead: number
  total: number
}

export interface HourTotals {
  healthy: number
  quiet: number
  sick: number
  protectedCount: number
  recovered: number
  dead: number
  isolated: number
  everInfected: number
  everClinical: number
  doses: number
  costSoFar: number
}

export interface HourFrame {
  hour: number
  state: Uint8Array
  loc: Uint8Array
  bunch: Float32Array
  tempC: Float32Array
  rh: Float32Array
  thi: Float32Array
  nh3: Float32Array
  aerosol: Float32Array
  flow: FlowField
  weather: Weather
  fans: { A: number; B: number; C: number }
  mistersOn: boolean
  pens: PenStat[]
  totals: HourTotals
}

export interface CostBreakdown {
  deaths: number
  weightGain: number
  treatment: number
  total: number
}

export interface ScenarioSummary {
  clinicalCases: number
  infections: number
  deaths: number
  subclinical: number
  chronic: number
  metaphylaxisDoses: number
  clinicalCourses: number
  antibioticDoses: number
  cost: CostBreakdown
  peakSickHour: number
  peakSick: number
  infectionsByPen: number[]
}

export interface ScenarioResult {
  config: ScenarioConfig
  frames: HourFrame[]
  summary: ScenarioSummary
  targetedPens: number[]
}

// ---------------------------------------------------------------------------
// Deterministic per-cow draws

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface HerdDraws {
  threshold: Float32Array
  incubation: Float32Array
  clinical: Float32Array
  mortality: Float32Array
  chronic: Float32Array
  cure: Float32Array
  deathDelay: Float32Array
  jitter: Float32Array
}

export const INDEX_CASES = [
  { cow: 2 * COWS_PER_PEN + 7, onsetHour: TIMELINE.crisisHour, incubation: 40 },
  { cow: 2 * COWS_PER_PEN + 13, onsetHour: 29, incubation: 44 },
]

export const HERD: HerdDraws = (() => {
  const rnd = mulberry32(20261107)
  const d: HerdDraws = {
    threshold: new Float32Array(HERD_SIZE),
    incubation: new Float32Array(HERD_SIZE),
    clinical: new Float32Array(HERD_SIZE),
    mortality: new Float32Array(HERD_SIZE),
    chronic: new Float32Array(HERD_SIZE),
    cure: new Float32Array(HERD_SIZE),
    deathDelay: new Float32Array(HERD_SIZE),
    jitter: new Float32Array(HERD_SIZE * 3),
  }
  for (let c = 0; c < HERD_SIZE; c++) {
    d.threshold[c] = -Math.log(1 - rnd())
    d.incubation[c] = BRD.incubationMinH + rnd() * (BRD.incubationMaxH - BRD.incubationMinH)
    d.clinical[c] = rnd()
    d.mortality[c] = rnd()
    d.chronic[c] = rnd()
    d.cure[c] = rnd()
    d.deathDelay[c] = 48 + rnd() * 40
    d.jitter[c * 3] = rnd() - 0.5
    d.jitter[c * 3 + 1] = rnd() - 0.5
    d.jitter[c * 3 + 2] = rnd() - 0.5
  }
  for (const ic of INDEX_CASES) {
    d.incubation[ic.cow] = ic.incubation
    d.clinical[ic.cow] = 0
  }
  return d
})()

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** Moisture released per cow, as vapour pressure * flow (kPa*m^3/s). */
const COW_VAPOR = 0.0116

// Cached sum_p n_p * G_p (conserved response to the herd's body heat / moisture / manure).
const herdCache = new Map<string, Float32Array>()
function herdResponse(flow: FlowField, nInPen: Float32Array): Float32Array {
  const key = flow.key + '#' + Array.from(nInPen).join(',')
  let out = herdCache.get(key)
  if (out) return out
  out = new Float32Array(N_CELLS)
  for (let p = 0; p < N_PENS; p++) {
    const n = nInPen[p]
    if (n === 0) continue
    const o = p * N_CELLS
    for (let cell = 0; cell < N_CELLS; cell++) out[cell] += n * flow.gConserved[o + cell]
  }
  if (herdCache.size > 4000) herdCache.clear()
  herdCache.set(key, out)
  return out
}

// ---------------------------------------------------------------------------
// Scenario run

export function ventilationAt(cfg: ScenarioConfig, hour: number): VentConfig {
  const acting = hour >= cfg.actionHour
  const failed = cfg.fanBFault && hour >= TIMELINE.crisisHour
  const boost = acting ? 1 + cfg.fanBoostPct / 100 : 1
  let fanB = failed ? 0 : 1
  const rebalance = cfg.rebalance && acting && failed
  if (rebalance) fanB = VENT.rebalancedFanB
  return { fanA: boost, fanB: fanB * boost, fanC: boost, rebalance }
}

export function runScenario(cfg: ScenarioConfig): ScenarioResult {
  const state = new Uint8Array(HERD_SIZE)
  const loc = new Uint8Array(HERD_SIZE)
  const hazard = new Float32Array(HERD_SIZE)
  const susc = new Float32Array(HERD_SIZE).fill(1)
  const infectedAt = new Float32Array(HERD_SIZE).fill(-1e9)
  const sickAt = new Float32Array(HERD_SIZE).fill(-1e9)
  const treated = new Uint8Array(HERD_SIZE)
  const illTHISum = new Float32Array(HERD_SIZE)
  const illTHIN = new Float32Array(HERD_SIZE)
  const outcome = new Uint8Array(HERD_SIZE) // 0 none, 1 subclinical, 2 clinical recovered, 3 chronic, 4 dead

  for (let c = 0; c < HERD_SIZE; c++) loc[c] = Math.floor(c / COWS_PER_PEN)
  for (const ic of INDEX_CASES) {
    state[ic.cow] = E
    infectedAt[ic.cow] = ic.onsetHour - ic.incubation
  }

  const frames: HourFrame[] = []
  const thi = new Float32Array(N_CELLS)
  const tempC = new Float32Array(N_CELLS)
  const rh = new Float32Array(N_CELLS)
  const nh3 = new Float32Array(N_CELLS)
  const aerosol = new Float32Array(N_CELLS)
  const nInPen = new Float32Array(N_PENS)
  const shedInPen = new Float32Array(N_PENS)
  const bunch = new Float32Array(N_PENS)
  let everInfected = INDEX_CASES.length
  let everClinical = 0
  let metaDoses = 0
  let clinicalCourses = 0
  let heatCost = 0
  let realizedDeathCost = 0
  let realizedPenaltyCost = 0
  let targetedPens: number[] = []
  const infectionsByPen = new Array(8).fill(0)
  for (const ic of INDEX_CASES) infectionsByPen[Math.floor(ic.cow / COWS_PER_PEN)]++
  let peakSick = 0
  let peakSickHour = 0

  const shedding = (c: number, h: number) => {
    const s = state[c]
    if (s === E) {
      const prog = (h - infectedAt[c]) / HERD.incubation[c]
      return prog >= BRD.presymptomaticShedStart ? BRD.presymptomaticShedding : BRD.earlyExposedShedding
    }
    if (s === I) return treated[c] ? BRD.treatedShedding : BRD.clinicalShedding
    return 0
  }

  const treat = (c: number) => {
    if (!treated[c]) {
      treated[c] = 1
      clinicalCourses++
    }
  }

  for (let h = 0; h <= HOURS; h++) {
    const acting = h >= cfg.actionHour
    const vent = ventilationAt(cfg, h)
    const flow = getFlowField(vent)
    const weather = outdoorWeather(h, cfg.heatwaveTemp)
    const misterLevel = acting ? cfg.misterPct / 100 : 0
    const mistersOn = misterLevel > 0

    // --- Isolation (BarnTwin fever detection moves sick cattle instantly).
    if (cfg.isolate && acting) {
      for (let c = 0; c < HERD_SIZE; c++) {
        if (state[c] === I && loc[c] !== HOSPITAL) {
          loc[c] = HOSPITAL
          treat(c)
        }
      }
    }

    // --- Sources.
    nInPen.fill(0)
    shedInPen.fill(0)
    for (let c = 0; c < HERD_SIZE; c++) {
      if (state[c] === D) continue
      nInPen[loc[c]]++
      shedInPen[loc[c]] += shedding(c, h)
    }

    const inletT = weather.tempC - HEAT.misterCoolingC * misterLevel
    const inletRH = Math.min(95, weather.rh + HEAT.misterRhAdd * misterLevel)
    const eIn = (inletRH / 100) * saturationVaporPressureKPa(inletT)
    const solarSrc = (weather.solarWm2 * CELL_M * CELL_M) / HEAT.airRhoCp
    const nh3Temp = Math.pow(AMMONIA.tempCoefficient, weather.tempC - 20)
    const soak = HEAT.misterSoakTHI * misterLevel

    const herd = herdResponse(flow, nInPen)
    aerosol.fill(0)
    for (let p = 0; p < N_PENS; p++) {
      const src = shedInPen[p] * BRD.shedEmission
      if (src <= 0) continue
      const o = p * N_CELLS
      for (let cell = 0; cell < N_CELLS; cell++) aerosol[cell] += src * flow.gAerosol[o + cell]
    }
    const heatPerCow = HEAT.cowSensibleW / HEAT.airRhoCp
    const ammPerCow = AMMONIA.perCowPpmM3s * nh3Temp
    for (let cell = 0; cell < N_CELLS; cell++) {
      const g = herd[cell]
      const T = inletT + solarSrc * flow.gUniform[cell] + heatPerCow * g
      const vap = COW_VAPOR * g
      const amm = ammPerCow * g
      const rel = Math.min(100, ((eIn + vap) / saturationVaporPressureKPa(T)) * 100)
      tempC[cell] = T
      rh[cell] = rel
      thi[cell] = thiAdjusted(thiNRC(T, rel), flow.speed[cell]) - soak
      nh3[cell] = AMMONIA.backgroundPpm + amm
    }

    // --- Pen averages + heat bunching.
    const pens: PenStat[] = []
    for (let p = 0; p < N_PENS; p++) {
      const cells = PEN_CELLS[p]
      let sT = 0, sRH = 0, sTHI = 0, sNH3 = 0, sW = 0, sA = 0
      for (const cell of cells) {
        sT += tempC[cell]
        sRH += rh[cell]
        sTHI += thi[cell]
        sNH3 += nh3[cell]
        sW += flow.speed[cell]
        sA += aerosol[cell]
      }
      const k = cells.length
      const penTHI = sTHI / k
      bunch[p] = p === HOSPITAL ? 0 : clamp01((penTHI - BRD.bunchTHIThreshold) / BRD.bunchTHIRange)
      pens.push({
        tempC: sT / k,
        rh: sRH / k,
        thiRaw: thiNRC(sT / k, sRH / k),
        thi: penTHI,
        nh3: sNH3 / k,
        wind: sW / k,
        aerosol: sA / k,
        bunch: bunch[p],
        healthy: 0,
        quiet: 0,
        sick: 0,
        protectedCount: 0,
        recovered: 0,
        dead: 0,
        total: 0,
      })
    }

    // --- Targeted / blanket metaphylaxis at the action point.
    if (h === cfg.actionHour && cfg.abx !== 'reactive') {
      let chosen: number[]
      if (cfg.abx === 'blanket') chosen = [0, 1, 2, 3, 4, 5, 6, 7]
      else {
        const maxA = Math.max(...pens.slice(0, 8).map((s) => s.aerosol), 1e-6)
        const risk = PENS.slice(0, 8).map((pen) => {
          let hidden = 0
          for (let c = 0; c < HERD_SIZE; c++) if (loc[c] === pen.index && (state[c] === E || state[c] === I)) hidden++
          return { p: pen.index, score: hidden / COWS_PER_PEN + pens[pen.index].aerosol / maxA }
        })
        risk.sort((a, b) => b.score - a.score)
        chosen = risk.slice(0, 2).map((r) => r.p).sort((a, b) => a - b)
      }
      targetedPens = chosen
      for (let c = 0; c < HERD_SIZE; c++) {
        if (!chosen.includes(loc[c])) continue
        const s = state[c]
        if (s === S) {
          state[c] = P
          susc[c] = BRD.protectedSusceptibility
          metaDoses++
        } else if (s === E) {
          metaDoses++
          if (HERD.cure[c] < BRD.metaphylaxisCure) {
            state[c] = P
            susc[c] = BRD.protectedSusceptibility
            hazard[c] = 0
          }
        } else if (s === R) {
          metaDoses++
        }
      }
    }

    // --- Transmission (airborne plume + nose-to-nose contact amplified by bunching).
    for (let c = 0; c < HERD_SIZE; c++) {
      const s = state[c]
      if (!(s === S || (s === P && susc[c] > 0))) continue
      const p = loc[c]
      const st = pens[p]
      const heatSusc = 1 + 0.05 * Math.max(0, st.thi - 72)
      const nh3Susc = 1 + 0.025 * Math.max(0, st.nh3 - 10)
      const contact = (shedInPen[p] / Math.max(1, nInPen[p])) * (1 + (BRD.bunchContactMultiplier - 1) * bunch[p])
      const lambda = (BRD.betaAir * st.aerosol + BRD.betaContact * contact) * susc[c] * heatSusc * nh3Susc
      hazard[c] += lambda
      if (hazard[c] >= HERD.threshold[c]) {
        state[c] = E
        infectedAt[c] = h
        everInfected++
        if (Math.floor(c / COWS_PER_PEN) < 8) infectionsByPen[Math.floor(c / COWS_PER_PEN)]++
      }
    }

    // --- Disease progression.
    for (let c = 0; c < HERD_SIZE; c++) {
      const s = state[c]
      if (s === E) {
        if (h >= infectedAt[c] + HERD.incubation[c]) {
          if (HERD.clinical[c] < BRD.clinicalFraction) {
            state[c] = I
            sickAt[c] = h
            everClinical++
            if (cfg.isolate && acting) {
              loc[c] = HOSPITAL
              treat(c)
            }
          } else {
            state[c] = R
            outcome[c] = 1
            realizedPenaltyCost += ECON.subclinicalPenalty
          }
        }
      } else if (s === I) {
        illTHISum[c] += pens[loc[c]].thi
        illTHIN[c]++
        if (!treated[c] && h >= sickAt[c] + BRD.farmerDetectDelayH) treat(c)
        const pm = mortalityProb(loc[c] === HOSPITAL, illTHISum[c] / illTHIN[c], treated[c] === 1)
        if (HERD.mortality[c] < pm && h >= sickAt[c] + HERD.deathDelay[c]) {
          state[c] = D
          outcome[c] = 4
          realizedDeathCost += ECON.mortality
        } else if (h >= sickAt[c] + BRD.illnessDurationH) {
          state[c] = P
          susc[c] = 0
          const chronic = HERD.chronic[c] < BRD.chronicFraction
          outcome[c] = chronic ? 3 : 2
          realizedPenaltyCost += chronic ? ECON.chronicPenalty : ECON.subclinicalPenalty
        }
      }
    }

    // --- Pen census + heat-stress production loss.
    const totals: HourTotals = {
      healthy: 0,
      quiet: 0,
      sick: 0,
      protectedCount: 0,
      recovered: 0,
      dead: 0,
      isolated: 0,
      everInfected,
      everClinical,
      doses: metaDoses + clinicalCourses,
      costSoFar: 0,
    }
    for (let c = 0; c < HERD_SIZE; c++) {
      const st = pens[loc[c]]
      st.total++
      switch (state[c]) {
        case S:
          st.healthy++
          totals.healthy++
          break
        case E:
          st.quiet++
          totals.quiet++
          break
        case I:
          st.sick++
          totals.sick++
          break
        case P:
          st.protectedCount++
          totals.protectedCount++
          break
        case R:
          st.recovered++
          totals.recovered++
          break
        default:
          st.dead++
          totals.dead++
      }
      if (loc[c] === HOSPITAL && state[c] !== D) totals.isolated++
      if (state[c] !== D) heatCost += ECON.heatStressPerCowHourTHI * Math.max(0, st.thi - 72)
    }
    if (totals.sick > peakSick) {
      peakSick = totals.sick
      peakSickHour = h
    }
    totals.costSoFar =
      realizedDeathCost +
      realizedPenaltyCost +
      heatCost +
      clinicalCourses * ECON.clinicalPull +
      metaDoses * ECON.preventativeDose

    frames.push({
      hour: h,
      state: state.slice(),
      loc: loc.slice(),
      bunch: bunch.slice(),
      tempC: tempC.slice(),
      rh: rh.slice(),
      thi: thi.slice(),
      nh3: nh3.slice(),
      aerosol: aerosol.slice(),
      flow,
      weather,
      fans: { A: vent.fanA, B: vent.fanB, C: vent.fanC },
      mistersOn,
      pens,
      totals,
    })
  }

  // --- Project outcomes of cattle still incubating or sick at the end of the window.
  let projDeaths = 0
  let projPenalty = 0
  let projClinical = 0
  let projCourses = 0
  let subclinical = 0
  let chronic = 0
  let deaths = 0
  for (let c = 0; c < HERD_SIZE; c++) {
    let o = outcome[c]
    const s = state[c]
    if (s === E) {
      if (HERD.clinical[c] < BRD.clinicalFraction) {
        projClinical++
        projCourses++
        o = HERD.mortality[c] < BRD.baseMortality ? 4 : HERD.chronic[c] < BRD.chronicFraction ? 3 : 2
      } else o = 1
    } else if (s === I) {
      if (!treated[c]) projCourses++
      const pm = mortalityProb(loc[c] === HOSPITAL, illTHISum[c] / Math.max(1, illTHIN[c]), true)
      o = HERD.mortality[c] < pm ? 4 : HERD.chronic[c] < BRD.chronicFraction ? 3 : 2
    }
    if (s === E || s === I) {
      if (o === 4) projDeaths += ECON.mortality
      else if (o === 3) projPenalty += ECON.chronicPenalty
      else projPenalty += ECON.subclinicalPenalty
    }
    if (o === 1) subclinical++
    if (o === 3) chronic++
    if (o === 4) deaths++
  }
  const courses = clinicalCourses + projCourses
  const deathCost = realizedDeathCost + projDeaths
  const weightGain = realizedPenaltyCost + projPenalty + heatCost
  const treatment = courses * ECON.clinicalPull + metaDoses * ECON.preventativeDose

  return {
    config: cfg,
    frames,
    targetedPens,
    summary: {
      clinicalCases: everClinical + projClinical,
      infections: everInfected,
      deaths,
      subclinical,
      chronic,
      metaphylaxisDoses: metaDoses,
      clinicalCourses: courses,
      antibioticDoses: metaDoses + courses,
      cost: { deaths: deathCost, weightGain, treatment, total: deathCost + weightGain + treatment },
      peakSick,
      peakSickHour,
      infectionsByPen,
    },
  }
}

function mortalityProb(isolated: boolean, meanTHI: number, wasTreated: boolean) {
  const heat = 1 + 0.06 * Math.max(0, meanTHI - 75)
  const iso = isolated ? BRD.hospitalMortalityFactor : 1
  const tx = wasTreated ? 1 : 1.3
  return Math.min(0.6, BRD.baseMortality * heat * iso * tx)
}

// ---------------------------------------------------------------------------
// Counterfactual bundle

export interface CounterfactualBundle {
  doNothing: ScenarioResult
  naive: ScenarioResult
  smart: ScenarioResult
  blanketReference: ScenarioResult
  current: ScenarioResult
  computeMs: number
}

const sameInterventions = (a: InterventionConfig, b: InterventionConfig) =>
  a.isolate === b.isolate &&
  a.fanBoostPct === b.fanBoostPct &&
  a.rebalance === b.rebalance &&
  a.misterPct === b.misterPct &&
  a.abx === b.abx &&
  a.actionHour === b.actionHour

export function runCounterfactuals(crisis: CrisisConfig, plan: InterventionConfig): CounterfactualBundle {
  const t0 = performance.now()
  const actionHour = plan.actionHour
  const doNothing = runScenario({ ...crisis, ...NO_INTERVENTION, actionHour })
  const naive = runScenario({ ...crisis, ...NAIVE_FIX, actionHour })
  const smart = runScenario({ ...crisis, ...SMART_PROTOCOL, actionHour })
  const blanketReference = runScenario({ ...crisis, ...SMART_PROTOCOL, abx: 'blanket', actionHour })
  let current: ScenarioResult
  if (sameInterventions(plan, { ...NO_INTERVENTION, actionHour })) current = doNothing
  else if (sameInterventions(plan, { ...NAIVE_FIX, actionHour })) current = naive
  else if (sameInterventions(plan, { ...SMART_PROTOCOL, actionHour })) current = smart
  else current = runScenario({ ...crisis, ...plan })
  return { doNothing, naive, smart, blanketReference, current, computeMs: performance.now() - t0 }
}

export type PlanKind = 'none' | 'naive' | 'smart' | 'custom'

export function classifyPlan(plan: InterventionConfig): PlanKind {
  const base = { actionHour: plan.actionHour }
  if (sameInterventions(plan, { ...NO_INTERVENTION, ...base })) return 'none'
  if (sameInterventions(plan, { ...NAIVE_FIX, ...base })) return 'naive'
  if (sameInterventions(plan, { ...SMART_PROTOCOL, ...base })) return 'smart'
  return 'custom'
}

// ---------------------------------------------------------------------------
// 2D cow coordinates (grid units) — spread when cool, bunched when hot, hospital when isolated.

const SPREAD_COLS = 5
const SPREAD_ROWS = 4

function sunflower(k: number, spacing: number) {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const r = spacing * Math.sqrt(k + 0.5)
  return { x: r * Math.cos(k * golden), z: r * Math.sin(k * golden) }
}

/**
 * Fills `out` with [x, z, heading, lying] per cow in grid units.
 * Heading 0 faces +z (south).
 */
export function cowTargets(frame: HourFrame, out: Float32Array) {
  let hospSlot = 0
  for (let c = 0; c < HERD_SIZE; c++) {
    const o = c * 4
    const home = Math.floor(c / COWS_PER_PEN)
    const k = c % COWS_PER_PEN
    const jx = HERD.jitter[c * 3]
    const jz = HERD.jitter[c * 3 + 1]
    const jr = HERD.jitter[c * 3 + 2]
    const dead = frame.state[c] === D
    if (frame.loc[c] === HOSPITAL && !dead) {
      const hp = PENS[HOSPITAL]
      const col = hospSlot % 6
      const row = Math.floor(hospSlot / 6)
      hospSlot++
      out[o] = hp.i0 + 0.4 + col * 0.62 + jx * 0.08
      out[o + 1] = hp.j0 + 0.5 + (row % 6) * 0.62 + jz * 0.08
      out[o + 2] = Math.PI * 0.5 + jr * 0.6
      out[o + 3] = 0
      continue
    }
    const pen = PENS[home]
    const col = k % SPREAD_COLS
    const row = Math.floor(k / SPREAD_COLS)
    const faceAlley = pen.row === 'north' ? 0 : Math.PI
    const sx = pen.i0 + 0.3 + col * (3.4 / (SPREAD_COLS - 1)) + jx * 0.12
    const sz = pen.j0 + 0.55 + row * (3.9 / (SPREAD_ROWS - 1)) + jz * 0.15
    const b = dead ? 0 : frame.bunch[home]
    // Two tight huddles per pen (shade + water trough).
    const cluster = k % 2
    const cx = pen.i0 + (cluster === 0 ? 1.15 : 2.85)
    const cz = pen.j0 + (pen.row === 'north' ? 1.6 + cluster * 1.5 : 3.4 - cluster * 1.5)
    const sf = sunflower(Math.floor(k / 2), 0.4)
    const bx = cx + sf.x
    const bz = cz + sf.z * 0.95
    out[o] = sx + (bx - sx) * b
    out[o + 1] = sz + (bz - sz) * b
    out[o + 2] = faceAlley + jr * (0.5 + 0.9 * b)
    out[o + 3] = dead ? 1 : 0
  }
  return out
}
