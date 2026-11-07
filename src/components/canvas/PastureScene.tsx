import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
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

const PLAYER = N_COWS // extra instance used when you play as a cow
const JERSEY = new THREE.Color(0.86, 0.62, 0.4)
const HOLSTEIN = new THREE.Color(0.96, 0.96, 0.94)
const FENCE_LIMIT = FIELD_R + 1.3

export interface PastureControls {
  /** Called whenever a cow moos; `pan` is -1 (left) .. 1 (right) for stereo. */
  onMoo?: (pan: number) => void
  /** When true, you drive the player cow (W/A/S/D, Shift, M) and the camera follows it. */
  playing?: boolean
  onExitPlay?: () => void
}

function PastureCows({ onMoo, playing = false, onExitPlay }: PastureControls) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const anchors = useRef<(THREE.Group | null)[]>([])
  const geometry = useMemo(() => makeCowGeometry(N_COWS + 1, 7), [])
  const material = useMemo(() => makeCowMaterial(), [])
  const [mooing, setMooing] = useState<Record<number, number>>({})
  const camera = useThree((s) => s.camera)
  const keys = useRef(new Set<string>())

  const sim = useMemo(() => {
    const rnd = seededRandom(21)
    const cows = Array.from({ length: N_COWS }, () => {
      const r = Math.sqrt(rnd()) * FIELD_R * 0.8
      const a = rnd() * Math.PI * 2
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, heading: rnd() * Math.PI * 2, tx: 0, tz: 0, mode: 'graze' as Mode, timer: rnd() * 4, pitch: 0, phase: rnd() * 10 }
    })
    const player = { x: 0, z: FIELD_R * 0.7, heading: Math.PI, speed: 0, pitch: 0 }
    return { cows, rnd, player, replies: [] as { cow: number; at: number }[], clock: 0 }
  }, [])

  const tmp = useMemo(
    () => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YXZ'), p: new THREE.Vector3(), s: new THREE.Vector3(COW_SCALE, COW_SCALE, COW_SCALE), zero: new THREE.Vector3(0, 0, 0), look: new THREE.Vector3(), cam: new THREE.Vector3() }),
    [],
  )

  const pos = (i: number) => (i === PLAYER ? sim.player : sim.cows[i])
  const moo = (i: number) => {
    const c = pos(i)
    const stamp = performance.now()
    setMooing((m) => ({ ...m, [i]: stamp }))
    window.setTimeout(() => setMooing((m) => (m[i] === stamp ? Object.fromEntries(Object.entries(m).filter(([k]) => Number(k) !== i)) : m)), 2400)
    // Pan relative to the camera so a cow on the left sounds on the left.
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
    const rel = new THREE.Vector3(c.x, 0, c.z).sub(camera.position)
    onMoo?.(Math.max(-1, Math.min(1, rel.dot(right) / 8)))
    if (i < N_COWS) {
      sim.cows[i].mode = 'idle'
      sim.cows[i].timer = 2.5
    }
  }

  // Keyboard: W/A/S/D or arrows to move, Shift to run, M to moo, Esc to stop playing.
  useEffect(() => {
    if (!playing) return
    const held = keys.current
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'escape') return onExitPlay?.()
      if (k === 'm' && !e.repeat) {
        moo(PLAYER)
        // Nearby cows sometimes moo back.
        sim.cows.forEach((c, i) => {
          const d = Math.hypot(c.x - sim.player.x, c.z - sim.player.z)
          if (d < 7 && sim.rnd() < 0.45) sim.replies.push({ cow: i, at: sim.clock + 0.6 + sim.rnd() * 1.2 })
        })
      }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) {
        e.preventDefault()
        held.add(k)
      }
    }
    const up = (e: KeyboardEvent) => held.delete(e.key.toLowerCase())
    const blur = () => held.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      held.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers read live refs
  }, [playing])

  useFrame(({ clock }, rawDt) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(rawDt, 0.05)
    const t = clock.elapsedTime
    sim.clock = t
    const { cows, rnd, player } = sim

    // --- Player cow (tank controls).
    if (playing) {
      const k = keys.current
      const turn = (k.has('a') || k.has('arrowleft') ? 1 : 0) - (k.has('d') || k.has('arrowright') ? 1 : 0)
      const thrust = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 0.55 : 0)
      const run = k.has('shift') ? 1.9 : 1
      player.heading += turn * 2.2 * dt
      const target = thrust * 2.6 * run
      player.speed += (target - player.speed) * (1 - Math.exp(-dt * 8))
      player.x += Math.sin(player.heading) * player.speed * dt
      player.z += Math.cos(player.heading) * player.speed * dt
      const r = Math.hypot(player.x, player.z)
      if (r > FENCE_LIMIT) {
        player.x *= FENCE_LIMIT / r
        player.z *= FENCE_LIMIT / r
      }
      // Cows step aside instead of overlapping.
      cows.forEach((c) => {
        const dx = c.x - player.x
        const dz = c.z - player.z
        const d = Math.hypot(dx, dz)
        if (d < 1.6 && d > 1e-3) {
          c.x += (dx / d) * (1.6 - d) * 0.5
          c.z += (dz / d) * (1.6 - d) * 0.5
        }
      })
      const bob = Math.abs(player.speed) > 0.2 ? Math.abs(Math.sin(t * 7)) * 0.05 : 0
      tmp.p.set(player.x, bob, player.z)
      tmp.e.set(0, player.heading, 0)
      tmp.q.setFromEuler(tmp.e)
      tmp.m.compose(tmp.p, tmp.q, tmp.s)
      // Third-person camera: eases toward a point behind and above the cow.
      tmp.cam.set(player.x - Math.sin(player.heading) * 8, 4.6, player.z - Math.cos(player.heading) * 8)
      camera.position.lerp(tmp.cam, 1 - Math.exp(-dt * 3.2))
      tmp.look.set(player.x, 1.2, player.z)
      camera.lookAt(tmp.look)
    } else {
      tmp.m.compose(tmp.p.set(0, -50, 0), tmp.q.identity(), tmp.zero)
    }
    m.setMatrixAt(PLAYER, tmp.m)
    m.setColorAt(PLAYER, JERSEY)

    // --- Herd: wander, graze, idle.
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
        if (Math.hypot(dx, dz) < 0.3) c.mode = 'graze'
        else {
          let dh = Math.atan2(dx, dz) - c.heading
          dh = Math.atan2(Math.sin(dh), Math.cos(dh))
          c.heading += dh * Math.min(1, dt * 1.5)
          const speed = 0.55 * Math.max(0, Math.cos(dh))
          c.x += Math.sin(c.heading) * speed * dt
          c.z += Math.cos(c.heading) * speed * dt
        }
      }
      c.pitch += ((c.mode === 'graze' ? 0.16 : 0) - c.pitch) * Math.min(1, dt * 2)
      const bob = c.mode === 'walk' ? Math.abs(Math.sin(t * 5 + c.phase)) * 0.04 : 0
      tmp.p.set(c.x, bob, c.z)
      tmp.e.set(c.pitch, c.heading, 0)
      tmp.q.setFromEuler(tmp.e)
      tmp.m.compose(tmp.p, tmp.q, tmp.s)
      m.setMatrixAt(i, tmp.m)
      m.setColorAt(i, HOLSTEIN)
    })
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true

    // Replies to the player's moo.
    if (sim.replies.length) {
      const due = sim.replies.filter((r) => r.at <= t)
      sim.replies = sim.replies.filter((r) => r.at > t)
      due.forEach((r) => moo(r.cow))
    }

    // Keep speech bubbles above their cow's head.
    anchors.current.forEach((g, i) => {
      if (!g) return
      const c = pos(i)
      g.position.set(c.x + Math.sin(c.heading) * 0.8, 1.9, c.z + Math.cos(c.heading) * 0.8)
    })
  })

  return (
    <>
      <instancedMesh
        ref={mesh}
        args={[geometry, material, N_COWS + 1]}
        frustumCulled={false}
        onClick={(e) => {
          e.stopPropagation()
          if (e.instanceId !== undefined) moo(e.instanceId)
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      />
      {Array.from({ length: N_COWS + 1 }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            anchors.current[i] = g
          }}
        >
          {mooing[i] && (
            <SceneHtml key={mooing[i]} center style={{ pointerEvents: 'none' }}>
              <div className="animate-[floatUp_2.4s_ease-out_forwards] rounded-2xl bg-white px-3 py-1 text-[15px] font-black whitespace-nowrap text-slate-800 shadow-lg">
                {i === PLAYER ? 'Moo! (you)' : 'Moo!'}
              </div>
            </SceneHtml>
          )}
          {i === PLAYER && playing && !mooing[i] && (
            <SceneHtml center position={[0, 0.2, 0]} style={{ pointerEvents: 'none' }}>
              <div className="flex flex-col items-center text-[12px] font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                You
                <span className="-mt-1 text-[14px]">▾</span>
              </div>
            </SceneHtml>
          )}
        </group>
      ))}
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

export default function PastureScene({
  night = false,
  onMoo,
  autoRotate = true,
  playing = false,
  onExitPlay,
}: PastureControls & { night?: boolean; autoRotate?: boolean }) {
  const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null)
  const overlay = useMemo(() => (overlayEl ? { current: overlayEl } : undefined), [overlayEl])
  return (
    <div className="relative h-full w-full">
      {overlay && (
        <Canvas dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <PerspectiveCamera makeDefault position={[0, 7.5, 19]} fov={42} />
          <OrbitControls
            enabled={!playing}
            target={[0, 1, -1]}
            autoRotate={autoRotate && !playing}
            autoRotateSpeed={0.25}
            enablePan={false}
            minDistance={10}
            maxDistance={34}
            maxPolarAngle={1.35}
          />
          <DayNightRig daylight={night ? 0 : 1} hourOfDay={night ? 1 : 15} lamps={night ? [[0, 3.6, -12.6]] : []} />
          <Ground size={260} color="#5b8f3a" />
          <Grass count={2600} radius={60} exclude={PASTURE_EXCLUDE} seed={4} />
          <Trees count={60} minR={20} maxR={52} exclude={PASTURE_EXCLUDE} seed={17} />
          <Fence />
          <RedBarn />
          {!night && <Birds />}
          {!night && <Clouds />}
          <OverlayContext.Provider value={overlay}>
            <PastureCows onMoo={onMoo} playing={playing} onExitPlay={onExitPlay} />
          </OverlayContext.Provider>
        </Canvas>
      )}
      {/* z-0 makes this its own stacking context so 3D labels stay beneath the HUD panels. */}
      <div ref={setOverlayEl} className="pointer-events-none absolute inset-0 z-0 overflow-hidden" />
    </div>
  )
}
