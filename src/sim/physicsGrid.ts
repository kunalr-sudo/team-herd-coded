// Quasi-steady 2D airflow + scalar transport solver for the barn.
//
// Air residence time in the barn (~30 s with all fans, a few minutes inside the
// stagnant eddy) is far shorter than the 1-hour simulation step, so every hour is
// treated as a steady advection-diffusion-decay problem. For each ventilation
// configuration we solve once for the Green's function of every pen (unit source
// spread over the pen) and cache it; hourly temperature, humidity, ammonia and
// pathogen fields are then cheap linear combinations of those responses.

import {
  CELL_M,
  CELL_PEN,
  CELL_VOLUME_M3,
  FACE_AREA_M2,
  FANS,
  GRID_H,
  GRID_W,
  HEAT,
  N_CELLS,
  N_PENS,
  PEN_CELLS,
  BRD,
  TIMELINE,
  VENT,
  cellIndex,
} from './constants'

export interface VentConfig {
  fanA: number
  fanB: number
  fanC: number
  /** 0 = fully open eddy, 1 = baffles closed / flow rebalanced. */
  rebalance: boolean
}

export interface FlowField {
  key: string
  cfg: VentConfig
  /** Cell-centred velocity components (m/s). u: West->East, w: North->South. */
  u: Float32Array
  w: Float32Array
  speed: Float32Array
  /** Strength of the recirculation eddy (0 = none). */
  eddy: number
  /** Inlet face speed (m/s). */
  inletSpeed: number
  /** Conserved-scalar response to a unit source (1 unit*m^3/s) in each pen: [pen * N_CELLS + cell]. */
  gConserved: Float32Array
  /** Same but for decaying aerosol (pathogen). */
  gAerosol: Float32Array
  /** Conserved response to a unit source in every cell (roof solar load). */
  gUniform: Float32Array
}

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

export function ventKey(c: VentConfig): string {
  return `${c.fanA.toFixed(2)}|${c.fanB.toFixed(2)}|${c.fanC.toFixed(2)}|${c.rebalance ? 1 : 0}`
}

export function eddyStrength(c: VentConfig): number {
  const imbalance = Math.max(0, (c.fanA + c.fanC) / 2 - c.fanB)
  return c.rebalance ? imbalance * 0.35 : imbalance
}

function buildVelocity(cfg: VentConfig) {
  const u = new Float32Array(N_CELLS)
  const w = new Float32Array(N_CELLS)
  const fanOf = (j: number) => {
    const f = FANS.find((fd) => j >= fd.j0 && j <= fd.j1)!
    return f.id === 'A' ? cfg.fanA : f.id === 'B' ? cfg.fanB : cfg.fanC
  }

  // Lane strength at the exhaust wall, smoothed across rows and renormalised to conserve mass.
  const raw = Array.from({ length: GRID_H }, (_, j) => fanOf(j))
  const lane = raw.map((_, j) => {
    let s = 0
    let wsum = 0
    for (let k = 0; k < GRID_H; k++) {
      const g = Math.exp(-((k - j) ** 2) / (2 * 1.1 ** 2))
      s += g * raw[k]
      wsum += g
    }
    return s / wsum
  })
  const rawSum = raw.reduce((a, b) => a + b, 0)
  const laneSum = lane.reduce((a, b) => a + b, 0)
  for (let j = 0; j < GRID_H; j++) lane[j] *= rawSum / Math.max(1e-6, laneSum)

  const mean = rawSum / GRID_H
  const inletSpeed = VENT.designSpeed * mean
  const blend = (i: number) => smooth((i + 0.5 - 6) / (GRID_W - 6))

  for (let j = 0; j < GRID_H; j++) {
    for (let i = 0; i < GRID_W; i++) {
      const s = blend(i)
      u[cellIndex(i, j)] = (1 - s) * inletSpeed + s * VENT.designSpeed * lane[j]
    }
  }
  // Continuity: dw/dz = -du/dx, integrated from the north wall (w = 0).
  for (let i = 0; i < GRID_W; i++) {
    const dsdx = (blend(i + 0.5) - blend(i - 0.5)) / CELL_M
    let wFace = 0
    for (let j = 0; j < GRID_H; j++) {
      const dudx = dsdx * (VENT.designSpeed * lane[j] - inletSpeed)
      const wNext = wFace - dudx * CELL_M
      w[cellIndex(i, j)] = 0.5 * (wFace + wNext)
      wFace = wNext
    }
  }

  const eddy = eddyStrength(cfg)
  if (eddy > 0) {
    const { i: ci, j: cj } = VENT.eddyCenter
    // Boosting the side fans while the centre is dead sharpens the shear layer and
    // enlarges the recirculation cell, pushing it toward Pens 4 and 8.
    const grow = 1 + VENT.eddyGrowthPerImbalance * Math.max(0, eddy - 1)
    const R2 = (VENT.deadZoneRadiusCells * grow) ** 2
    const Rc = VENT.eddyCoreCells * grow
    const shift = VENT.eddyDriftCells * Math.max(0, eddy - 1)
    for (let j = 0; j < GRID_H; j++) {
      for (let i = 0; i < GRID_W; i++) {
        const c = cellIndex(i, j)
        const dx = i + 0.5 - (ci + shift)
        const dz = j + 0.5 - (cj + shift * 0.5)
        const r2 = dx * dx + dz * dz
        const damp = 1 - VENT.deadZoneDamping * Math.min(1, eddy) * Math.exp(-r2 / R2)
        u[c] *= damp
        w[c] *= damp
        const r = Math.sqrt(r2)
        if (r > 1e-4) {
          const vt = VENT.eddyPeakSpeed * eddy * (r / Rc) * Math.exp(0.5 * (1 - (r / Rc) ** 2))
          // Counter-clockwise seen from above: north side flows West (upwind into Pen 2),
          // east side flows North (into Pen 4), south side flows East along the alley.
          u[c] += (vt * dz) / r
          w[c] += (vt * -dx) / r
        }
      }
    }
  }

  const speed = new Float32Array(N_CELLS)
  for (let c = 0; c < N_CELLS; c++) speed[c] = Math.hypot(u[c], w[c])
  return { u, w, speed, eddy, inletSpeed }
}

interface Coeffs {
  aW: Float32Array
  aE: Float32Array
  aN: Float32Array
  aS: Float32Array
  diag: Float32Array
}

function buildCoefficients(u: Float32Array, w: Float32Array, inletSpeed: number, decayPerS: number): Coeffs {
  const aW = new Float32Array(N_CELLS)
  const aE = new Float32Array(N_CELLS)
  const aN = new Float32Array(N_CELLS)
  const aS = new Float32Array(N_CELLS)
  const diag = new Float32Array(N_CELLS)
  const Dc = (VENT.eddyDiffusivity * FACE_AREA_M2) / CELL_M
  const kV = decayPerS * CELL_VOLUME_M3

  for (let j = 0; j < GRID_H; j++) {
    for (let i = 0; i < GRID_W; i++) {
      const c = cellIndex(i, j)
      let out = 0
      let inn = 0
      let diff = 0
      // West face
      if (i === 0) {
        // Fresh inlet air carries zero excess concentration.
        inn += inletSpeed * FACE_AREA_M2
      } else {
        const F = 0.5 * (u[c] + u[c - 1]) * FACE_AREA_M2 // positive = into this cell
        if (F > 0) {
          aW[c] = F + Dc
          inn += F
        } else {
          aW[c] = Dc
          out += -F
        }
        diff += Dc
      }
      // East face
      if (i === GRID_W - 1) {
        const F = u[c] * FACE_AREA_M2
        out += Math.max(F, 0.05 * FACE_AREA_M2)
      } else {
        const F = 0.5 * (u[c] + u[c + 1]) * FACE_AREA_M2 // positive = out of this cell
        if (F < 0) {
          aE[c] = -F + Dc
          inn += -F
        } else {
          aE[c] = Dc
          out += F
        }
        diff += Dc
      }
      // North face
      if (j > 0) {
        const F = 0.5 * (w[c] + w[c - GRID_W]) * FACE_AREA_M2 // positive = southward = into cell
        if (F > 0) {
          aN[c] = F + Dc
          inn += F
        } else {
          aN[c] = Dc
          out += -F
        }
        diff += Dc
      }
      // South face
      if (j < GRID_H - 1) {
        const F = 0.5 * (w[c] + w[c + GRID_W]) * FACE_AREA_M2 // positive = out of cell
        if (F < 0) {
          aS[c] = -F + Dc
          inn += -F
        } else {
          aS[c] = Dc
          out += F
        }
        diff += Dc
      }
      diag[c] = Math.max(out, inn) + diff + kV
    }
  }
  return { aW, aE, aN, aS, diag }
}

/** Solve A x = b for many right-hand sides at once with symmetric Gauss-Seidel sweeps. */
function solveMany(co: Coeffs, rhs: Float32Array, nRhs: number, maxIter = 900, tol = 1e-5): Float32Array {
  const x = new Float32Array(nRhs * N_CELLS)
  const { aW, aE, aN, aS, diag } = co
  for (let r = 0; r < nRhs; r++) {
    const o = r * N_CELLS
    let scale = 0
    for (let c = 0; c < N_CELLS; c++) scale = Math.max(scale, rhs[o + c] / diag[c])
    for (let it = 0; it < maxIter; it++) {
      let maxDelta = 0
      const forward = it % 2 === 0
      for (let jj = 0; jj < GRID_H; jj++) {
        const j = forward ? jj : GRID_H - 1 - jj
        for (let ii = 0; ii < GRID_W; ii++) {
          const i = forward ? ii : GRID_W - 1 - ii
          const c = j * GRID_W + i
          let s = rhs[o + c]
          if (i > 0) s += aW[c] * x[o + c - 1]
          if (i < GRID_W - 1) s += aE[c] * x[o + c + 1]
          if (j > 0) s += aN[c] * x[o + c - GRID_W]
          if (j < GRID_H - 1) s += aS[c] * x[o + c + GRID_W]
          const v = s / diag[c]
          const d = Math.abs(v - x[o + c])
          if (d > maxDelta) maxDelta = d
          x[o + c] = v
        }
      }
      if (it > 8 && maxDelta < tol * Math.max(scale, 1e-6)) break
    }
  }
  return x
}

const cache = new Map<string, FlowField>()

export function getFlowField(cfg: VentConfig): FlowField {
  const key = ventKey(cfg)
  const hit = cache.get(key)
  if (hit) return hit

  const { u, w, speed, eddy, inletSpeed } = buildVelocity(cfg)
  const nRhs = N_PENS + 1
  const rhs = new Float32Array(nRhs * N_CELLS)
  for (let p = 0; p < N_PENS; p++) {
    const cells = PEN_CELLS[p]
    for (const c of cells) rhs[p * N_CELLS + c] = 1 / cells.length
  }
  for (let c = 0; c < N_CELLS; c++) rhs[N_PENS * N_CELLS + c] = 1

  const conserved = solveMany(buildCoefficients(u, w, inletSpeed, 0), rhs, nRhs)
  const aerosol = solveMany(buildCoefficients(u, w, inletSpeed, BRD.aerosolDecayPerS), rhs, N_PENS)

  const field: FlowField = {
    key,
    cfg,
    u,
    w,
    speed,
    eddy,
    inletSpeed,
    gConserved: conserved.subarray(0, N_PENS * N_CELLS),
    gAerosol: aerosol,
    gUniform: conserved.subarray(N_PENS * N_CELLS),
  }
  cache.set(key, field)
  return field
}

export function clearFlowCache() {
  cache.clear()
}

/** Bilinear velocity sample at continuous grid coordinates (cell units). */
export function sampleVelocity(field: FlowField, gx: number, gz: number, out: { u: number; w: number }) {
  const fx = Math.min(GRID_W - 1.001, Math.max(0, gx - 0.5))
  const fz = Math.min(GRID_H - 1.001, Math.max(0, gz - 0.5))
  const i0 = Math.floor(fx)
  const j0 = Math.floor(fz)
  const tx = fx - i0
  const tz = fz - j0
  const c00 = j0 * GRID_W + i0
  const c10 = c00 + 1
  const c01 = c00 + GRID_W
  const c11 = c01 + 1
  out.u =
    (field.u[c00] * (1 - tx) + field.u[c10] * tx) * (1 - tz) + (field.u[c01] * (1 - tx) + field.u[c11] * tx) * tz
  out.w =
    (field.w[c00] * (1 - tx) + field.w[c10] * tx) * (1 - tz) + (field.w[c01] * (1 - tx) + field.w[c11] * tx) * tz
  return out
}

export function sampleScalar(values: Float32Array, gx: number, gz: number): number {
  const i = Math.min(GRID_W - 1, Math.max(0, Math.floor(gx)))
  const j = Math.min(GRID_H - 1, Math.max(0, Math.floor(gz)))
  return values[j * GRID_W + i]
}

export interface Weather {
  tempC: number
  rh: number
  solarWm2: number
  heatwave: number
}

/** Outdoor weather: diurnal cycle with a heatwave between hours ~6 and ~150. */
export function outdoorWeather(hour: number, heatwavePeakC: number): Weather {
  const ramp = smooth(hour / 12) * (1 - smooth((hour - TIMELINE.heatwaveEndHour) / 18))
  const normalPeak = 27
  const peak = normalPeak + ramp * (heatwavePeakC - normalPeak)
  const swing = 5.5
  const mean = peak - swing
  const phase = Math.cos((2 * Math.PI * ((hour % 24) - 15)) / 24)
  const tempC = mean + swing * phase
  const rh = 50 - 24 * phase
  const hod = hour % 24
  const solar = hod > 6 && hod < 20 ? Math.sin((Math.PI * (hod - 6)) / 14) : 0
  return { tempC, rh, solarWm2: HEAT.roofSolarPeakWm2 * solar * (0.6 + 0.4 * ramp), heatwave: ramp }
}

export function penOfCell(c: number): number {
  return CELL_PEN[c]
}
