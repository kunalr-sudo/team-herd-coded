import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { GRID_H, GRID_W } from '../../sim/constants'
import { useSim } from '../../store/useSimulationStore'
import { germLevel } from './coords'

type RGBA = [number, number, number, number]

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
function ramp(stops: [number, RGBA][], v: number): RGBA {
  if (v <= stops[0][0]) return stops[0][1]
  for (let k = 1; k < stops.length; k++) {
    const [p1, c1] = stops[k]
    const [p0, c0] = stops[k - 1]
    if (v <= p1) {
      const t = (v - p0) / (p1 - p0)
      return [lerp(c0[0], c1[0], t), lerp(c0[1], c1[1], t), lerp(c0[2], c1[2], t), lerp(c0[3], c1[3], t)]
    }
  }
  return stops[stops.length - 1][1]
}

const GERM: [number, RGBA][] = [
  [0, [40, 20, 0, 0]],
  [0.2, [250, 204, 21, 0]],
  [0.32, [250, 204, 21, 80]],
  [0.5, [249, 115, 22, 170]],
  [1, [239, 68, 68, 225]],
]
const HEAT: [number, RGBA][] = [
  [0, [30, 64, 175, 120]],
  [0.3, [34, 197, 94, 120]],
  [0.55, [250, 204, 21, 150]],
  [0.8, [249, 115, 22, 175]],
  [1, [220, 38, 38, 205]],
]
const AMMONIA: [number, RGBA][] = [
  [0, [88, 28, 135, 0]],
  [0.25, [126, 34, 206, 70]],
  [0.65, [192, 38, 211, 150]],
  [1, [244, 114, 182, 210]],
]

export default function HeatmapFloor() {
  const mode = useSim((s) => s.heatmap)
  const frame = useSim((s) => s.bundle.current.frames[s.hour])

  const tex = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array(GRID_W * GRID_H * 4), GRID_W, GRID_H, THREE.RGBAFormat)
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearFilter
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])

  useEffect(() => {
    if (mode === 'none') return
    const data = tex.image.data as Uint8Array
    for (let r = 0; r < GRID_H; r++) {
      const j = GRID_H - 1 - r
      for (let i = 0; i < GRID_W; i++) {
        const c = j * GRID_W + i
        let col: RGBA
        if (mode === 'germ') col = ramp(GERM, germLevel(frame.aerosol[c]))
        else if (mode === 'heat') col = ramp(HEAT, Math.min(1, Math.max(0, (frame.thi[c] - 70) / 20)))
        else col = ramp(AMMONIA, Math.min(1, frame.nh3[c] / 35))
        const o = (r * GRID_W + i) * 4
        data[o] = col[0]
        data[o + 1] = col[1]
        data[o + 2] = col[2]
        data[o + 3] = col[3]
      }
    }
    tex.needsUpdate = true
  }, [mode, frame, tex])

  if (mode === 'none') return null
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} renderOrder={1}>
      <planeGeometry args={[GRID_W, GRID_H]} />
      <meshBasicMaterial map={tex} transparent opacity={0.78} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
