import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { FANS, GRID_H, GRID_W, PENS, TIMELINE } from '../../sim/constants'
import { daylightFor } from '../../sim/daylight'
import { LEVEL_COLOR, penStatus } from '../../sim/narrative'
import { useSim } from '../../store/useSimulationStore'
import AirflowParticles from './AirflowParticles'
import CattleInstances from './CattleInstances'
import { DayNightRig, Grass, Ground, Trees } from './Environment'
import HeatmapFloor from './HeatmapFloor'
import PenOverlays from './PenOverlays'
import SceneHtml from './SceneHtml'
import { OverlayContext } from './overlayContext'
import { seededRandom, wx, wz } from './coords'

const HALF_W = GRID_W / 2
const HALF_H = GRID_H / 2
const WALL_H = 2.6
const RIDGE_H = 4.4

function IsoCamera({ sidePanels }: { sidePanels: boolean }) {
  const size = useThree((s) => s.size)
  const ref = useRef<THREE.OrthographicCamera>(null)
  useEffect(() => {
    if (!ref.current) return
    // Leave room for the side HUD panels.
    const usableW = Math.max(400, size.width - (sidePanels ? 700 : 120))
    ref.current.zoom = Math.min(usableW / 28, (size.height - (sidePanels ? 250 : 200)) / 22)
    ref.current.updateProjectionMatrix()
  }, [size, sidePanels])
  return <OrthographicCamera ref={ref} makeDefault position={[11, 24, 28]} near={-100} far={200} />
}

function Label({
  position,
  children,
  color = '#94a3b8',
  size = 11,
}: {
  position: [number, number, number]
  children: ReactNode
  color?: string
  size?: number
}) {
  return (
    <SceneHtml position={position} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div
        style={{ color, fontSize: size, letterSpacing: '0.12em' }}
        className="rounded bg-slate-950/55 px-1.5 py-0.5 font-mono font-semibold whitespace-nowrap uppercase"
      >
        {children}
      </div>
    </SceneHtml>
  )
}

function BarnShell() {
  const roof = useMemo(() => {
    const pts: number[] = []
    const seg = (a: number[], b: number[]) => pts.push(...a, ...b)
    for (let x = -HALF_W; x <= HALF_W + 0.01; x += 4) {
      seg([x, 0, -HALF_H], [x, WALL_H, -HALF_H])
      seg([x, 0, HALF_H], [x, WALL_H, HALF_H])
      seg([x, WALL_H, -HALF_H], [x, RIDGE_H, 0])
      seg([x, RIDGE_H, 0], [x, WALL_H, HALF_H])
    }
    seg([-HALF_W, RIDGE_H, 0], [HALF_W, RIDGE_H, 0])
    seg([-HALF_W, WALL_H, -HALF_H], [HALF_W, WALL_H, -HALF_H])
    seg([-HALF_W, WALL_H, HALF_H], [HALF_W, WALL_H, HALF_H])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])

  const grid = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i <= GRID_W; i++) pts.push(i - HALF_W, 0.005, -HALF_H, i - HALF_W, 0.005, HALF_H)
    for (let j = 0; j <= GRID_H; j++) pts.push(-HALF_W, 0.005, j - HALF_H, HALF_W, 0.005, j - HALF_H)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]}>
        <planeGeometry args={[GRID_W + 3, GRID_H + 3]} />
        <meshLambertMaterial color="#7a6a55" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[GRID_W, GRID_H]} />
        <meshLambertMaterial color="#5c544a" />
      </mesh>
      <lineSegments geometry={grid}>
        <lineBasicMaterial color="#2b2620" transparent opacity={0.35} />
      </lineSegments>
      <lineSegments geometry={roof}>
        <lineBasicMaterial color="#e2e8f0" transparent opacity={0.28} />
      </lineSegments>
      {/* Wooden knee walls + translucent curtain above */}
      {[-HALF_H, HALF_H].map((z) => (
        <group key={z}>
          <mesh position={[0, 0.45, z]}>
            <boxGeometry args={[GRID_W, 0.9, 0.12]} />
            <meshLambertMaterial color="#7b5636" />
          </mesh>
          <mesh position={[0, 0.9 + (WALL_H - 0.9) / 2, z]}>
            <boxGeometry args={[GRID_W, WALL_H - 0.9, 0.04]} />
            <meshLambertMaterial color="#cbd5e1" transparent opacity={z < 0 ? 0.28 : 0.06} depthWrite={false} />
          </mesh>
        </group>
      ))}
      <mesh position={[HALF_W + 0.05, WALL_H / 2, 0]}>
        <boxGeometry args={[0.1, WALL_H, GRID_H]} />
        <meshLambertMaterial color="#8a6a4a" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {Array.from({ length: 7 }, (_, k) => -HALF_W + k * 4).flatMap((x) =>
        [-HALF_H, HALF_H].map((z) => (
          <mesh key={`${x}${z}`} position={[x, WALL_H / 2, z]}>
            <boxGeometry args={[0.16, WALL_H, 0.16]} />
            <meshLambertMaterial color="#6b4a2e" />
          </mesh>
        )),
      )}
    </group>
  )
}

function FeedAlley() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[wx(9), 0.012, wz(6)]}>
        <planeGeometry args={[16, 2]} />
        <meshLambertMaterial color="#8d8a84" />
      </mesh>
      {[wz(5) + 0.08, wz(7) - 0.08].map((z) => (
        <mesh key={z} position={[wx(9), 0.12, z]}>
          <boxGeometry args={[16, 0.24, 0.16]} />
          <meshLambertMaterial color="#6e4f33" />
        </mesh>
      ))}
      <Label position={[wx(3), 0.3, wz(6)]} color="#e2e8f0" size={10}>
        Feed Alley
      </Label>
    </group>
  )
}

function PenBlocks() {
  const frame = useSim((s) => s.bundle.current.frames[s.hour])
  const xray = useSim((s) => s.xray)
  const selectPen = useSim((s) => s.selectPen)
  const selected = useSim((s) => s.selectedPen)
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([])

  const statuses = PENS.map((p) => penStatus(p.index, frame.pens[p.index], xray))

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    statuses.forEach((st, i) => {
      const m = mats.current[i]
      if (!m) return
      const base = st.level === 'critical' ? 0.22 + 0.12 * Math.sin(t * 4) : st.level === 'danger' ? 0.18 : 0.1
      m.opacity = selected === i ? base + 0.12 : base
    })
  })

  return (
    <group>
      {PENS.map((p, idx) => {
        const x0 = wx(p.i0) + 0.06
        const x1 = wx(p.i1 + 1) - 0.06
        const z0 = wz(p.j0) + 0.06
        const z1 = wz(p.j1 + 1) - 0.06
        const cx = (x0 + x1) / 2
        const cz = (z0 + z1) / 2
        const w = x1 - x0
        const d = z1 - z0
        const color = new THREE.Color(p.index === 8 ? '#22d3ee' : LEVEL_COLOR[statuses[idx].level])
        const glow = color.clone().multiplyScalar(1.8)
        const rails: [number, number, number, number, number][] = [
          [cx, z0, w, 0.05, 0],
          [cx, z1, w, 0.05, 0],
          [x0, cz, 0.05, d, 0],
          [x1, cz, 0.05, d, 0],
        ]
        return (
          <group key={p.index}>
            <mesh
              rotation-x={-Math.PI / 2}
              position={[cx, 0.02, cz]}
              onClick={(e) => {
                e.stopPropagation()
                selectPen(selected === p.index ? null : p.index)
              }}
            >
              <planeGeometry args={[w, d]} />
              <meshBasicMaterial
                ref={(m) => {
                  mats.current[idx] = m
                }}
                color={color}
                transparent
                opacity={0.12}
                depthWrite={false}
              />
            </mesh>
            {rails.map(([x, z, rw, rd], k) => (
              <mesh key={k} position={[x, 0.42, z]}>
                <boxGeometry args={[rw, 0.05, rd]} />
                <meshBasicMaterial color={glow} toneMapped={false} />
              </mesh>
            ))}
            {[
              [x0, z0],
              [x1, z0],
              [x0, z1],
              [x1, z1],
            ].map(([x, z], k) => (
              <mesh key={`post${k}`} position={[x, 0.22, z]}>
                <boxGeometry args={[0.07, 0.44, 0.07]} />
                <meshStandardMaterial color="#475569" />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

type FanStatus = 'normal' | 'boosted' | 'failed' | 'portable'

function Fan({ id, z, strength, status }: { id: string; z: number; strength: number; status: FanStatus }) {
  const blades = useRef<THREE.Group>(null)
  const ring = useRef<THREE.MeshBasicMaterial>(null)
  const failed = status === 'failed'
  useFrame(({ clock }, dt) => {
    if (blades.current) blades.current.rotation.x += dt * strength * 14
    if (ring.current && failed) {
      const k = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 5)
      ring.current.color.setRGB(1.6 + k * 1.4, 0.15, 0.12)
    }
  })
  const ringColor = failed ? '#ef4444' : status === 'normal' ? '#38bdf8' : '#22d3ee'
  const badge = {
    failed: { text: `FAN ${id} FAILED`, cls: 'bg-red-600/90 text-white animate-pulse' },
    portable: { text: `FAN ${id} · PORTABLE`, cls: 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50' },
    boosted: { text: `FAN ${id} +25%`, cls: 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50' },
    normal: { text: `FAN ${id}`, cls: 'bg-slate-800/80 text-slate-300' },
  }[status]
  return (
    <group position={[HALF_W + 0.12, 1.3, z]}>
      <mesh rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.95, 0.07, 10, 40]} />
        <meshBasicMaterial ref={ring} color={new THREE.Color(ringColor).multiplyScalar(1.6)} toneMapped={false} />
      </mesh>
      <mesh rotation-z={Math.PI / 2} position={[0.02, 0, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 0.04, 32]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.7} />
      </mesh>
      <group ref={blades} position={[0.08, 0, 0]}>
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} rotation-x={(k * Math.PI) / 2}>
            <boxGeometry args={[0.04, 0.82, 0.22]} />
            <meshStandardMaterial
              color={failed ? '#7f1d1d' : '#cbd5e1'}
              emissive={failed ? '#ef4444' : '#000000'}
              emissiveIntensity={failed ? 0.6 : 0}
            />
          </mesh>
        ))}
      </group>
      <SceneHtml position={[0.9, 1.35, 0]} center zIndexRange={[6, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`font-mono text-[11px] font-bold whitespace-nowrap rounded px-1.5 py-0.5 ${badge.cls}`}>
          {badge.text}
        </div>
      </SceneHtml>
    </group>
  )
}

function FanBanks() {
  const frame = useSim((s) => s.bundle.current.frames[s.hour])
  const cfg = useSim((s) => s.bundle.current.config)
  return (
    <group>
      {FANS.map((f) => {
        const strength = frame.fans[f.id]
        const portable =
          f.id === 'B' && cfg.fanBFault && cfg.rebalance && frame.hour >= cfg.actionHour && frame.hour >= TIMELINE.crisisHour
        const status: FanStatus =
          strength === 0 ? 'failed' : portable ? 'portable' : strength > 1.01 ? 'boosted' : 'normal'
        return <Fan key={f.id} id={f.id} z={wz((f.j0 + f.j1 + 1) / 2)} strength={strength} status={status} />
      })}
      <Label position={[HALF_W + 1.7, 0.1, HALF_H + 0.9]} color="#cbd5e1" size={10}>
        Exhaust (East)
      </Label>
    </group>
  )
}

function Mist({ on }: { on: boolean }) {
  const N = 260
  const ref = useRef<THREE.Points>(null)
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    return g
  }, [])
  const seeds = useMemo(() => {
    const rnd = seededRandom(11)
    return Array.from({ length: N }, () => [rnd(), rnd(), rnd()])
  }, [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const pos = geom.attributes.position as THREE.BufferAttribute
    const t = clock.elapsedTime
    for (let k = 0; k < N; k++) {
      const [a, b, c] = seeds[k]
      const life = (t * 0.35 + a) % 1
      pos.setXYZ(k, -HALF_W + 0.2 + life * 3.2, 2.1 - life * 1.2 + Math.sin(t * 2 + c * 9) * 0.05, -HALF_H + 0.4 + b * (GRID_H - 0.8))
    }
    pos.needsUpdate = true
  })
  if (!on) return null
  return (
    <points ref={ref} geometry={geom}>
      <pointsMaterial color="#e0f2fe" size={3} sizeAttenuation={false} transparent opacity={0.55} depthWrite={false} />
    </points>
  )
}

function WestInlets() {
  const misters = useSim((s) => s.bundle.current.frames[s.hour].mistersOn)
  return (
    <group>
      {Array.from({ length: 6 }, (_, k) => (
        <mesh key={k} position={[-HALF_W - 0.05, 1.0 + k * 0.22, 0]}>
          <boxGeometry args={[0.06, 0.06, GRID_H - 0.4]} />
          <meshBasicMaterial color={new THREE.Color('#38bdf8').multiplyScalar(1.3)} toneMapped={false} />
        </mesh>
      ))}
      <Mist on={misters} />
      <Label position={[-HALF_W - 1.2, 2.9, 0]} color={misters ? '#a5f3fc' : '#7dd3fc'}>
        {misters ? 'Fresh Air In + Misters ON' : 'Fresh Air In (West)'}
      </Label>
    </group>
  )
}

// Keep these stable: Grass/Trees rebuild their instanced meshes when props change identity.
const BARN_FOOTPRINT = { x0: -HALF_W - 3, x1: HALF_W + 4, z0: -HALF_H - 3, z1: HALF_H + 4.5 }
const LAMPS: [number, number, number][] = [
  [-8, RIDGE_H - 0.5, 0],
  [0, RIDGE_H - 0.5, 0],
  [8, RIDGE_H - 0.5, 0],
]

function SceneLighting() {
  const hour = useSim((s) => s.hour)
  const mode = useSim((s) => s.lighting)
  return <DayNightRig daylight={daylightFor(hour, mode)} hourOfDay={mode === 'day' ? 13 : mode === 'night' ? 1 : hour % 24} lamps={LAMPS} />
}

function Effects() {
  const hour = useSim((s) => s.hour)
  const mode = useSim((s) => s.lighting)
  const d = daylightFor(hour, mode)
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur luminanceThreshold={0.95 + 1.6 * d} luminanceSmoothing={0.25} intensity={0.85} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.3} darkness={0.45} />
    </EffectComposer>
  )
}

export default function BarnScene({ sidePanels = true }: { sidePanels?: boolean }) {
  const selectPen = useSim((s) => s.selectPen)
  const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null)
  const overlay = useMemo(() => (overlayEl ? { current: overlayEl } : undefined), [overlayEl])
  return (
    <div className="relative h-full w-full">
      {overlay && (
        <Canvas dpr={[1, 2]} gl={{ antialias: true }} onPointerMissed={() => selectPen(null)}>
          <IsoCamera sidePanels={sidePanels} />
          <OrbitControls makeDefault target={[0, 0, 0]} enableDamping minPolarAngle={0.35} maxPolarAngle={1.25} minZoom={10} maxZoom={120} />
          <SceneLighting />
          <Ground />
          <Grass exclude={BARN_FOOTPRINT} />
          <Trees exclude={BARN_FOOTPRINT} />
          <OverlayContext.Provider value={overlay}>
            <BarnShell />
            <HeatmapFloor />
            <FeedAlley />
            <PenBlocks />
            <WestInlets />
            <FanBanks />
            <AirflowParticles />
            <CattleInstances />
            <PenOverlays />
          </OverlayContext.Provider>
          <Effects />
        </Canvas>
      )}
      {/* z-0 makes this its own stacking context so 3D labels stay beneath the HUD panels. */}
      <div ref={setOverlayEl} className="pointer-events-none absolute inset-0 z-0 overflow-hidden" />
    </div>
  )
}
