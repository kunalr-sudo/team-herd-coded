import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CELL_M, GRID_H, GRID_W } from '../../sim/constants'
import { sampleScalar, sampleVelocity } from '../../sim/physicsGrid'
import { useSim } from '../../store/useSimulationStore'
import { germLevel, seededRandom, wx, wz } from './coords'

const N = 1500
/** Visual time compression: real air speed (m/s) -> cells per second on screen. */
const VIS = 3.6

export default function AirflowParticles() {
  const lines = useRef<THREE.LineSegments>(null)
  const state = useMemo(() => {
    const rnd = seededRandom(7)
    const s = {
      gx: new Float32Array(N),
      gz: new Float32Array(N),
      y: new Float32Array(N),
      age: new Float32Array(N),
      life: new Float32Array(N),
    }
    for (let k = 0; k < N; k++) {
      s.gx[k] = rnd() * GRID_W
      s.gz[k] = rnd() * GRID_H
      s.y[k] = 0.5 + rnd() * 1.8
      s.life[k] = 3 + rnd() * 6
      s.age[k] = rnd() * s.life[k]
    }
    return s
  }, [])

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 6), 3))
    return g
  }, [])

  const vel = useMemo(() => ({ u: 0, w: 0 }), [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const { bundle, hour, xray } = useSim.getState()
    const frame = bundle.current.frames[hour]
    const flow = frame.flow
    const pos = geom.attributes.position as THREE.BufferAttribute
    const col = geom.attributes.color as THREE.BufferAttribute
    const P = pos.array as Float32Array
    const C = col.array as Float32Array

    for (let k = 0; k < N; k++) {
      sampleVelocity(flow, state.gx[k], state.gz[k], vel)
      const vx = (vel.u / CELL_M) * VIS
      const vz = (vel.w / CELL_M) * VIS
      state.gx[k] += vx * dt
      state.gz[k] += vz * dt
      state.age[k] += dt
      if (
        state.gx[k] >= GRID_W - 0.05 ||
        state.gx[k] < 0 ||
        state.gz[k] < 0.02 ||
        state.gz[k] > GRID_H - 0.02 ||
        state.age[k] > state.life[k]
      ) {
        const fromInlet = Math.random() < 0.6
        state.gx[k] = fromInlet ? Math.random() * 0.8 : Math.random() * GRID_W
        state.gz[k] = 0.1 + Math.random() * (GRID_H - 0.2)
        state.y[k] = 0.5 + Math.random() * 1.8
        state.age[k] = 0
        state.life[k] = 3 + Math.random() * 6
      }

      const speed = Math.hypot(vx, vz)
      const len = Math.min(0.9, 0.06 + speed * 0.16) / Math.max(speed, 1e-3)
      const hx = wx(state.gx[k])
      const hz = wz(state.gz[k])
      const o = k * 6
      P[o] = hx
      P[o + 1] = state.y[k]
      P[o + 2] = hz
      P[o + 3] = hx - vx * len
      P[o + 4] = state.y[k]
      P[o + 5] = hz - vz * len

      const fade = Math.min(1, state.age[k] / 0.6, (state.life[k] - state.age[k]) / 0.8)
      let r: number, g: number, b: number
      if (xray) {
        const v = germLevel(sampleScalar(frame.aerosol, state.gx[k], state.gz[k]))
        if (v < 0.2) {
          r = 0.18
          g = 0.38
          b = 0.75
        } else if (v < 0.6) {
          const t = (v - 0.2) / 0.4
          r = 0.18 + t * 2.1
          g = 0.38 + t * 1.5
          b = 0.75 - t * 0.6
        } else {
          const t = (v - 0.6) / 0.4
          r = 2.28 + t * 0.5
          g = 1.88 - t * 1.6
          b = 0.15
        }
      } else {
        r = 0.3
        g = 0.45
        b = 0.72
      }
      C[o] = r * fade
      C[o + 1] = g * fade
      C[o + 2] = b * fade
      C[o + 3] = r * 0.05 * fade
      C[o + 4] = g * 0.05 * fade
      C[o + 5] = b * 0.05 * fade
    }
    pos.needsUpdate = true
    col.needsUpdate = true
  })

  return (
    <lineSegments ref={lines} geometry={geom} frustumCulled={false}>
      <lineBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </lineSegments>
  )
}
