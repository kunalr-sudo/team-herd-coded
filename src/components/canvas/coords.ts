import { GRID_H, GRID_W } from '../../sim/constants'

/** Grid units (cell edges at integers) -> world units. One cell = one world unit. */
export const wx = (gx: number) => gx - GRID_W / 2
export const wz = (gz: number) => gz - GRID_H / 2

export const STATE_COLORS = {
  healthy: '#4ade80',
  quiet: '#facc15',
  sick: '#ef4444',
  protected: '#22d3ee',
  dead: '#3f3f46',
}

/** Small deterministic PRNG for render-time randomness (keeps components pure). */
export function seededRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Log-scaled germ load (0..1) so low-level drift into neighbouring pens stays visible. */
export function germLevel(aerosol: number) {
  return Math.min(1, Math.log1p(aerosol / 0.007) / Math.log1p(0.25 / 0.007))
}
