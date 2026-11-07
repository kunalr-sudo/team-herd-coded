export type LightingMode = 'auto' | 'day' | 'night'

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** 0 = deep night, 1 = full sun. Sunrise ~05:30, sunset ~20:30 (summer heatwave). */
export function daylightFactor(hourOfDay: number) {
  return clamp01(Math.sin((Math.PI * (hourOfDay - 5.5)) / 15) * 1.7)
}

export function daylightFor(hour: number, mode: LightingMode) {
  if (mode === 'day') return 1
  if (mode === 'night') return 0
  return daylightFactor(hour % 24)
}

/** Sun arc from East (morning) to West (evening), in world units. */
export function sunPosition(hourOfDay: number): [number, number, number] {
  const t = (Math.PI * Math.min(20.5, Math.max(5.5, hourOfDay) - 5.5)) / 15
  return [32 * Math.cos(t), 6 + 26 * Math.sin(t), 14]
}
