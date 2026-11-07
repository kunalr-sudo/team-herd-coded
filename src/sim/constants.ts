// Barn geometry, veterinary epidemiology rates and economics for BarnTwin.
// Grid convention: i = 0..GRID_W-1 runs West (inlets) -> East (exhaust fans),
// j = 0..GRID_H-1 runs North -> South. One cell is CELL_M metres square.

export const GRID_W = 24
export const GRID_H = 12
export const N_CELLS = GRID_W * GRID_H
export const CELL_M = 2.5
export const CEILING_M = 4
export const CELL_VOLUME_M3 = CELL_M * CELL_M * CEILING_M
export const FACE_AREA_M2 = CELL_M * CEILING_M

export const HOURS = 168
export const HERD_SIZE = 160
export const COWS_PER_PEN = 20
export const HEAD_VALUE_USD = 1800
export const HERD_VALUE_USD = HERD_SIZE * HEAD_VALUE_USD

export type PenRow = 'north' | 'south' | 'hospital'

export interface PenDef {
  index: number
  label: string
  short: string
  row: PenRow
  i0: number
  i1: number
  j0: number
  j1: number
}

export const HOSPITAL = 8

export const PENS: PenDef[] = [
  { index: 0, label: 'Pen 1', short: 'P1', row: 'north', i0: 1, i1: 4, j0: 0, j1: 4 },
  { index: 1, label: 'Pen 2', short: 'P2', row: 'north', i0: 5, i1: 8, j0: 0, j1: 4 },
  { index: 2, label: 'Pen 3', short: 'P3', row: 'north', i0: 9, i1: 12, j0: 0, j1: 4 },
  { index: 3, label: 'Pen 4', short: 'P4', row: 'north', i0: 13, i1: 16, j0: 0, j1: 4 },
  { index: 4, label: 'Pen 5', short: 'P5', row: 'south', i0: 1, i1: 4, j0: 7, j1: 11 },
  { index: 5, label: 'Pen 6', short: 'P6', row: 'south', i0: 5, i1: 8, j0: 7, j1: 11 },
  { index: 6, label: 'Pen 7', short: 'P7', row: 'south', i0: 9, i1: 12, j0: 7, j1: 11 },
  { index: 7, label: 'Pen 8', short: 'P8', row: 'south', i0: 13, i1: 16, j0: 7, j1: 11 },
  { index: 8, label: 'Hospital Pen', short: 'HOSP', row: 'hospital', i0: 19, i1: 22, j0: 8, j1: 11 },
]
export const N_PENS = PENS.length
export const PRODUCTION_PENS = PENS.slice(0, 8)

export interface FanDef {
  id: 'A' | 'B' | 'C'
  j0: number
  j1: number
}

export const FANS: FanDef[] = [
  { id: 'A', j0: 0, j1: 3 },
  { id: 'B', j0: 4, j1: 7 },
  { id: 'C', j0: 8, j1: 11 },
]

export const cellIndex = (i: number, j: number) => j * GRID_W + i

/** Pen membership for each cell (-1 = alley / open floor). */
export const CELL_PEN: Int8Array = (() => {
  const out = new Int8Array(N_CELLS).fill(-1)
  for (const p of PENS) {
    for (let j = p.j0; j <= p.j1; j++) for (let i = p.i0; i <= p.i1; i++) out[cellIndex(i, j)] = p.index
  }
  return out
})()

export const PEN_CELLS: number[][] = PENS.map((p) => {
  const cells: number[] = []
  for (let j = p.j0; j <= p.j1; j++) for (let i = p.i0; i <= p.i1; i++) cells.push(cellIndex(i, j))
  return cells
})

/** Story timeline (hours since Monday 00:00). */
export const TIMELINE = {
  crisisHour: 18,
  defaultActionHour: 30,
  hiddenSpreadStart: 24,
  hiddenSpreadEnd: 60,
  heatwaveEndHour: 132,
}

export const VENT = {
  /** Design air speed through the barn with all three fans at 100% (m/s). */
  designSpeed: 1.8,
  boostFactor: 1.25,
  /** Portable fan + closed baffles: effective Fan B replacement after rebalancing. */
  rebalancedFanB: 0.85,
  /** Turbulent eddy diffusivity used by the transport solver (m^2/s). */
  eddyDiffusivity: 0.35,
  /** Recirculation eddy over Pen 3 when the centre fan stalls. */
  eddyCenter: { i: 10.0, j: 3.4 },
  eddyCoreCells: 3.0,
  eddyPeakSpeed: 0.95,
  deadZoneDamping: 0.94,
  deadZoneRadiusCells: 4.6,
  eddyGrowthPerImbalance: 1.6,
  eddyDriftCells: 8,
}

export const HEAT = {
  /** Sensible heat from one finishing steer (W). */
  cowSensibleW: 1100,
  /** Net roof solar gain at noon (W per m^2 floor). */
  roofSolarPeakWm2: 55,
  airRhoCp: 1206,
  misterCoolingC: 4.5,
  misterRhAdd: 14,
  /** Direct soaking credit (THI points) for cows under misters. */
  misterSoakTHI: 2.2,
}

export const AMMONIA = {
  /** NH3 emission per cow at 20 C, expressed as ppm*m^3/s. */
  perCowPpmM3s: 7,
  tempCoefficient: 1.07,
  backgroundPpm: 2,
}

export const BRD = {
  /** Airborne transmission coefficient (per hour per unit aerosol concentration). */
  betaAir: 0.12,
  /** Nose-to-nose contact transmission (per hour per shedding pen-mate fraction). */
  betaContact: 0.03,
  bunchContactMultiplier: 2.8,
  bunchTHIThreshold: 76,
  bunchTHIRange: 8,
  incubationMinH: 36,
  incubationMaxH: 72,
  /** Fraction of incubation after which quietly infected cattle start shedding. */
  presymptomaticShedStart: 0.4,
  presymptomaticShedding: 0.35,
  earlyExposedShedding: 0.04,
  clinicalShedding: 1.0,
  treatedShedding: 0.45,
  clinicalFraction: 0.7,
  farmerDetectDelayH: 12,
  illnessDurationH: 96,
  baseMortality: 0.07,
  chronicFraction: 0.14,
  hospitalMortalityFactor: 0.55,
  protectedSusceptibility: 0.15,
  metaphylaxisCure: 0.6,
  /** Aerosol viability decay (1/s) — BRD pathogens lose infectivity within minutes. */
  aerosolDecayPerS: 1 / 150,
  /** Per-cow aerosol emission for a fully shedding animal (units*m^3/s). */
  shedEmission: 1.0,
}

export const ECON = {
  clinicalPull: 45,
  preventativeDose: 28,
  subclinicalPenalty: 115,
  chronicPenalty: 260,
  mortality: HEAD_VALUE_USD,
  /** Lost gain per cow-hour per effective THI point above 72 (USD). */
  heatStressPerCowHourTHI: 0.03,
}

/** NRC (1971) temperature-humidity index. T in deg C, RH in %. */
export function thiNRC(tempC: number, rh: number): number {
  return 1.8 * tempC + 32 - (0.55 - 0.0055 * rh) * (1.8 * tempC - 26)
}

/** Mader et al. (2006) wind-adjusted THI (indoor, no solar term). */
export function thiAdjusted(thi: number, windMs: number): number {
  return thi + 4.51 - 1.992 * windMs
}

/** Livestock Weather Safety Index categories for cattle. */
export function thiCategory(thi: number): 'Normal' | 'Alert' | 'Danger' | 'Emergency' {
  if (thi < 75) return 'Normal'
  if (thi < 79) return 'Alert'
  if (thi < 84) return 'Danger'
  return 'Emergency'
}

export function saturationVaporPressureKPa(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3))
}

export function hourLabel(hour: number): string {
  const day = Math.floor(hour / 24)
  const hh = hour % 24
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon']
  return `${days[day]} ${String(hh).padStart(2, '0')}:00`
}
