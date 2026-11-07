import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { HERD_SIZE } from '../../sim/constants'
import { D, E, HERD, I, P, cowTargets } from '../../sim/cattleEngine'
import { useSim } from '../../store/useSimulationStore'
import { STATE_COLORS, wx, wz } from './coords'
import { makeCowGeometry, makeCowMaterial } from './cowModel'

const COL = {
  healthy: new THREE.Color(0.96, 0.96, 0.94),
  quiet: new THREE.Color(STATE_COLORS.quiet),
  sick: new THREE.Color(STATE_COLORS.sick),
  protected: new THREE.Color(STATE_COLORS.protected).multiplyScalar(1.25),
  dead: new THREE.Color(STATE_COLORS.dead),
}

export default function CattleInstances() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => makeCowGeometry(HERD_SIZE, 42), [])
  const material = useMemo(() => makeCowMaterial(), [])
  const frame = useSim((s) => s.bundle.current.frames[s.hour])
  const target = useMemo(() => cowTargets(frame, new Float32Array(HERD_SIZE * 4)), [frame])
  const cur = useRef<Float32Array | null>(null)

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YXZ'), p: new THREE.Vector3(), s: new THREE.Vector3(1.25, 1.25, 1.25), c: new THREE.Color() }),
    [],
  )

  useFrame(({ clock }, rawDt) => {
    const m = mesh.current
    if (!m) return
    if (!cur.current) cur.current = target.slice()
    const c = cur.current
    const dt = Math.min(rawDt, 0.05)
    const k = 1 - Math.exp(-dt * 2.4)
    const t = clock.elapsedTime
    const { xray } = useSim.getState()
    const state = frame.state

    for (let i = 0; i < HERD_SIZE; i++) {
      const o = i * 4
      c[o] += (target[o] - c[o]) * k
      c[o + 1] += (target[o + 1] - c[o + 1]) * k
      let dh = target[o + 2] - c[o + 2]
      dh = Math.atan2(Math.sin(dh), Math.cos(dh))
      c[o + 2] += dh * k
      c[o + 3] += (target[o + 3] - c[o + 3]) * k

      const s = state[i]
      const alive = s !== D
      const seed = HERD.jitter[i * 3] * 20
      const sway = alive ? Math.sin(t * 0.6 + seed) * 0.03 : 0
      const lying = c[o + 3]
      tmp.p.set(wx(c[o]) + sway, 0.02 + lying * 0.14, wz(c[o + 1]) + (alive ? Math.cos(t * 0.5 + seed) * 0.03 : 0))
      tmp.e.set(0, c[o + 2] + (alive ? Math.sin(t * 0.8 + seed) * 0.08 : 0), lying * (Math.PI / 2))
      tmp.q.setFromEuler(tmp.e)
      tmp.m.compose(tmp.p, tmp.q, tmp.s)
      m.setMatrixAt(i, tmp.m)

      const pulse = 0.5 + 0.5 * Math.sin(t * 4 + seed)
      if (s === I) tmp.c.copy(COL.sick).multiplyScalar(2.6 + 1.2 * pulse)
      else if (s === E && xray) tmp.c.copy(COL.quiet).multiplyScalar(2.2 + 1.2 * pulse)
      else if (s === P) tmp.c.copy(COL.protected)
      else if (s === D) tmp.c.copy(COL.dead)
      else tmp.c.copy(COL.healthy)
      m.setColorAt(i, tmp.c)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[geometry, material, HERD_SIZE]} frustumCulled={false} />
  )
}
