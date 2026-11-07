import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { DayNightRig, Grass, Ground, Trees } from './Environment'
import SceneHtml from './SceneHtml'
import { OverlayContext } from './overlayContext'
import { seededRandom } from './coords'
import { makeCowGeometry, makeCowMaterial } from './cowModel'

const N_COWS = 12
const FIELD_R = 9.5
const COW_SCALE = 2.1
const PASTURE_EXCLUDE = { x0: -5, x1: 5, z0: -21, z1: -11.5 }

type Mode = 'walk' | 'graze' | 'idle'

function PastureCows({ onMoo }: { onMoo?: (cow: number, x: number) => void }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const anchor = useRef<THREE.Group>(null)
  const geometry = useMemo(() => makeCowGeometry(N_COWS, 7), [])
  const material = useMemo(() => makeCowMaterial(), [])
  const [moo, setMoo] = useState<{ cow: number; key: number } | null>(null)

  const sim = useMemo(() => {
    const rnd = seededRandom(21)
    const cows = Array.from({ length: N_COWS }, () => {
      const r = Math.sqrt(rnd()) * FIELD_R * 0.8
      const a = rnd() * Math.PI * 2
      return {
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        heading: rnd() * Math.PI * 2,
        tx: 0,
        tz: 0,
        mode: 'graze' as Mode,
        timer: rnd() * 4,
        pitch: 0,
        phase: rnd() * 10,
      }
    })
    return { cows, rnd, nextMoo: 2.5, mooCow: -1, mooUntil: 0 }
  }, [])

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YXZ'), p: new THREE.Vector3(), s: new THREE.Vector3(COW_SCALE, COW_SCALE, COW_SCALE), c: new THREE.Color(0.96, 0.96, 0.94) }), [])

  useFrame(({ clock }, rawDt) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(rawDt, 0.05)
    const t = clock.elapsedTime
    const { cows, rnd } = sim
    cows.forEach((c, i) => {
      c.timer -= dt
      if (c.timer <= 0) {
        const roll = rnd()
        c.mode = roll < 0.45 ? 'graze' : roll < 0.85 ? 'walk' : 'idle'
        c.timer = c.mode === 'walk' ? 6 : 3 + rnd() * 6
        if (c.mode === 'walk') {
          const r = Math.sqrt(rnd()) * FIELD_R
          const a = rnd() * Math.PI * 2
          c.tx = Math.cos(a) * r
          c.tz = Math.sin(a) * r
        }
      }
      if (c.mode === 'walk') {
        const dx = c.tx - c.x
        const dz = c.tz - c.z
        const dist = Math.hypot(dx, dz)
        if (dist < 0.3) c.mode = 'graze'
        else {
          let dh = Math.atan2(dx, dz) - c.heading
          dh = Math.atan2(Math.sin(dh), Math.cos(dh))
          c.heading += dh * Math.min(1, dt * 1.5)
          const speed = 0.55 * Math.max(0, Math.cos(dh))
          c.x += Math.sin(c.heading) * speed * dt
          c.z += Math.cos(c.heading) * speed * dt
        }
      }
      const targetPitch = c.mode === 'graze' ? 0.16 : 0
      c.pitch += (targetPitch - c.pitch) * Math.min(1, dt * 2)
      const bob = c.mode === 'walk' ? Math.abs(Math.sin(t * 5 + c.phase)) * 0.04 : 0
      tmp.p.set(c.x, bob, c.z)
      tmp.e.set(c.pitch, c.heading, 0)
      tmp.q.setFromEuler(tmp.e)
      tmp.m.compose(tmp.p, tmp.q, tmp.s)
      m.setMatrixAt(i, tmp.m)
      m.setColorAt(i, tmp.c)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true

    if (t > sim.nextMoo) {
      const cow = Math.floor(rnd() * N_COWS)
      sim.nextMoo = t + 4 + rnd() * 8
      sim.mooCow = cow
      setMoo({ cow, key: t })
      onMoo?.(cow, cows[cow].x / FIELD_R)
      cows[cow].mode = 'idle'
      cows[cow].timer = 2.5
    }
    if (anchor.current && sim.mooCow >= 0) {
      const c = cows[sim.mooCow]
      anchor.current.position.set(c.x + Math.sin(c.heading) * 0.8, 1.9, c.z + Math.cos(c.heading) * 0.8)
    }
  })

  return (
    <>
      <instancedMesh ref={mesh} args={[geometry, material, N_COWS]} frustumCulled={false} />
      <group ref={anchor}>
        {moo && (
          <SceneHtml key={moo.key} center style={{ pointerEvents: 'none' }}>
            <div className="animate-[floatUp_2.4s_ease-out_forwards] rounded-2xl bg-white px-3 py-1 text-[15px] font-black text-slate-800 shadow-lg">
              Moo! 🐮
            </div>
          </SceneHtml>
        )}
      </group>
    </>
  )
}

function Fence() {
  const posts = 36
  return (
    <group>
      {Array.from({ length: posts }, (_, k) => {
        const a = (k / posts) * Math.PI * 2
        return (
          <mesh key={k} position={[Math.cos(a) * (FIELD_R + 2), 0.45, Math.sin(a) * (FIELD_R + 2)]}>
            <boxGeometry args={[0.14, 0.9, 0.14]} />
            <meshLambertMaterial color="#8b6a46" />
          </mesh>
        )
      })}
      {[0.35, 0.72].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[FIELD_R + 2, 0.035, 4, 72]} />
          <meshLambertMaterial color="#a07f58" />
        </mesh>
      ))}
    </group>
  )
}

function RedBarn() {
  const roof = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-2.6, 0)
    shape.lineTo(0, 1.8)
    shape.lineTo(2.6, 0)
    shape.lineTo(-2.6, 0)
    const g = new THREE.ExtrudeGeometry(shape, { depth: 6.4, bevelEnabled: false })
    g.translate(0, 0, -3.2)
    return g
  }, [])
  return (
    <group position={[0, 0, -16]} rotation-y={0.15}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[5, 3, 6]} />
        <meshLambertMaterial color="#a23a2c" />
      </mesh>
      <mesh geometry={roof} position={[0, 3, 0]}>
        <meshLambertMaterial color="#4a3b33" />
      </mesh>
      <mesh position={[0, 1.1, 3.02]}>
        <boxGeometry args={[1.8, 2.2, 0.05]} />
        <meshLambertMaterial color="#f5efe6" />
      </mesh>
    </group>
  )
}

function Birds({ count = 7 }: { count?: number }) {
  const refs = useRef<(THREE.Group | null)[]>([])
  const birds = useMemo(() => {
    const rnd = seededRandom(5)
    return Array.from({ length: count }, () => ({ r: 6 + rnd() * 10, h: 7 + rnd() * 5, speed: 0.25 + rnd() * 0.25, phase: rnd() * 6.28 }))
  }, [count])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    birds.forEach((b, i) => {
      const g = refs.current[i]
      if (!g) return
      const a = t * b.speed + b.phase
      g.position.set(Math.cos(a) * b.r, b.h + Math.sin(t * 0.7 + b.phase) * 0.6, Math.sin(a) * b.r - 4)
      g.rotation.y = -a
      const flap = Math.sin(t * 9 + b.phase) * 0.6
      ;(g.children[0] as THREE.Object3D).rotation.z = flap
      ;(g.children[1] as THREE.Object3D).rotation.z = -flap
    })
  })
  return (
    <>
      {birds.map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g
          }}
        >
          {[1, -1].map((side) => (
            <group key={side}>
              <mesh position={[0.22 * side, 0, 0]}>
                <boxGeometry args={[0.44, 0.03, 0.12]} />
                <meshBasicMaterial color="#1f2937" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </>
  )
}

function Clouds() {
  const group = useRef<THREE.Group>(null)
  const puffs = useMemo(() => {
    const rnd = seededRandom(13)
    return Array.from({ length: 6 }, () => ({
      x: -40 + rnd() * 80,
      y: 18 + rnd() * 6,
      z: -45 + rnd() * 25,
      s: 2 + rnd() * 2,
    }))
  }, [])
  useFrame((_, dt) => {
    if (group.current) group.current.position.x = ((group.current.position.x + dt * 0.4 + 50) % 100) - 50
  })
  return (
    <group ref={group}>
      {puffs.map((p, k) => (
        <group key={k} position={[p.x, p.y, p.z]} scale={p.s}>
          {[
            [0, 0, 0, 1.4],
            [1.3, -0.2, 0.2, 1],
            [-1.2, -0.3, -0.1, 1.1],
            [0.4, 0.5, 0, 0.9],
          ].map(([x, y, z, r], j) => (
            <mesh key={j} position={[x, y, z]}>
              <icosahedronGeometry args={[r, 1]} />
              <meshLambertMaterial color="#ffffff" flatShading />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export default function PastureScene({ night = false, onMoo, autoRotate = true }: { night?: boolean; onMoo?: (cow: number, pan: number) => void; autoRotate?: boolean }) {
  const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null)
  const overlay = useMemo(() => (overlayEl ? { current: overlayEl } : undefined), [overlayEl])
  return (
    <div className="relative h-full w-full">
      {overlay && (
        <Canvas dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <PerspectiveCamera makeDefault position={[0, 7.5, 19]} fov={42} />
          <OrbitControls target={[0, 1, -1]} autoRotate={autoRotate} autoRotateSpeed={0.25} enablePan={false} minDistance={10} maxDistance={34} maxPolarAngle={1.35} />
          <DayNightRig daylight={night ? 0 : 1} hourOfDay={night ? 1 : 15} lamps={night ? [[0, 3.6, -12.6]] : []} />
          <Ground size={260} color="#5b8f3a" />
          <Grass count={2600} radius={60} exclude={PASTURE_EXCLUDE} seed={4} />
          <Trees count={60} minR={20} maxR={52} exclude={PASTURE_EXCLUDE} seed={17} />
          <Fence />
          <RedBarn />
          {!night && <Birds />}
          {!night && <Clouds />}
          <OverlayContext.Provider value={overlay}>
            <PastureCows onMoo={onMoo} />
          </OverlayContext.Provider>
        </Canvas>
      )}
      {/* z-0 makes this its own stacking context so 3D labels stay beneath the HUD panels. */}
      <div ref={setOverlayEl} className="pointer-events-none absolute inset-0 z-0 overflow-hidden" />
    </div>
  )
}
