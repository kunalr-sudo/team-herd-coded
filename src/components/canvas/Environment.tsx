import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { sunPosition } from '../../sim/daylight'
import { seededRandom } from './coords'

interface Rect {
  x0: number
  x1: number
  z0: number
  z1: number
}

const inside = (r: Rect | undefined, x: number, z: number) => !!r && x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1

const NIGHT_SKY = new THREE.Color('#070b16')
const DAY_SKY = new THREE.Color('#b9def5')
const DUSK_SUN = new THREE.Color('#ffab66')
const NOON_SUN = new THREE.Color('#fff6e3')

/**
 * Sun / moon / sky rig. `daylight` (0 night .. 1 noon) is the target; values ease toward
 * it every frame so scrubbing or playing the timeline fades smoothly between day and night.
 */
export function DayNightRig({ daylight, hourOfDay, lamps = [] }: { daylight: number; hourOfDay: number; lamps?: [number, number, number][] }) {
  const scene = useThree((s) => s.scene)
  const ambient = useRef<THREE.AmbientLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  const moon = useRef<THREE.DirectionalLight>(null)
  const lampLights = useRef<(THREE.PointLight | null)[]>([])
  const lampMats = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const cur = useRef(daylight)
  const sky = useMemo(() => new THREE.Color(), [])
  const fog = useMemo(() => new THREE.Fog('#070b16', 70, 170), [])

  useFrame((_, dt) => {
    cur.current += (daylight - cur.current) * (1 - Math.exp(-dt * 3))
    const d = cur.current
    const n = 1 - d
    sky.copy(NIGHT_SKY).lerp(DAY_SKY, d)
    scene.background = sky
    fog.color.copy(sky)
    scene.fog = fog
    if (ambient.current) {
      ambient.current.intensity = 0.16 + 0.32 * d
      ambient.current.color.setRGB(0.55 + 0.45 * d, 0.62 + 0.38 * d, 0.85 + 0.15 * d)
    }
    if (hemi.current) hemi.current.intensity = 0.22 + 0.5 * d
    if (sun.current) {
      sun.current.intensity = 1.5 * Math.pow(d, 0.8)
      sun.current.color.copy(DUSK_SUN).lerp(NOON_SUN, Math.min(1, d * 1.6))
      sun.current.position.set(...sunPosition(hourOfDay))
    }
    if (moon.current) moon.current.intensity = 0.5 * n
    lampLights.current.forEach((l) => {
      if (l) l.intensity = 7 * n * n
    })
    lampMats.current.forEach((m) => {
      if (m) m.color.setRGB(0.3 + 3.2 * n, 0.25 + 2.4 * n, 0.15 + 1.2 * n)
    })
  })

  return (
    <>
      <ambientLight ref={ambient} />
      <hemisphereLight ref={hemi} args={['#d6ecff', '#35522a', 0.6]} />
      <directionalLight ref={sun} />
      <directionalLight ref={moon} position={[-14, 26, 18]} color="#9fb6ff" />
      {lamps.map((p, k) => (
        <group key={k} position={p}>
          <pointLight
            ref={(l) => {
              lampLights.current[k] = l
            }}
            color="#ffcf8a"
            distance={13}
            decay={1.4}
          />
          <mesh>
            <sphereGeometry args={[0.12, 10, 8]} />
            <meshBasicMaterial
              ref={(m) => {
                lampMats.current[k] = m
              }}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  )
}

export function Ground({ size = 240, color = '#4a7a33' }: { size?: number; color?: string }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.03, 0]}>
      <planeGeometry args={[size, size]} />
      <meshLambertMaterial color={color} />
    </mesh>
  )
}

/** Instanced grass tufts scattered outside an exclusion rectangle. */
export function Grass({ count = 1600, radius = 46, exclude, seed = 3 }: { count?: number; radius?: number; exclude?: Rect; seed?: number }) {
  const mesh = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.07, 0.32, 4)
    geo.translate(0, 0.16, 0)
    const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), count)
    const rnd = seededRandom(seed)
    const mat = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const col = new THREE.Color()
    let k = 0
    while (k < count) {
      const r = Math.sqrt(rnd()) * radius
      const a = rnd() * Math.PI * 2
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (inside(exclude, x, z)) continue
      const s = 0.6 + rnd() * 0.9
      q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.4, rnd() * Math.PI, (rnd() - 0.5) * 0.4))
      mat.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.8 + rnd() * 0.8), s))
      m.setMatrixAt(k, mat)
      m.setColorAt(k, col.setHSL(0.24 + rnd() * 0.08, 0.5 + rnd() * 0.2, 0.28 + rnd() * 0.14))
      k++
    }
    return m
  }, [count, radius, exclude, seed])
  return <primitive object={mesh} />
}

/** Instanced low-poly trees (trunk + two-tier canopy) in a ring around the scene. */
export function Trees({ count = 46, minR = 17, maxR = 44, exclude, seed = 9 }: { count?: number; minR?: number; maxR?: number; exclude?: Rect; seed?: number }) {
  const group = useMemo(() => {
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.24, 1.6, 6)
    trunkGeo.translate(0, 0.8, 0)
    const lowGeo = new THREE.IcosahedronGeometry(1.25, 0)
    lowGeo.translate(0, 2.3, 0)
    const highGeo = new THREE.ConeGeometry(0.95, 1.8, 7)
    highGeo.translate(0, 3.4, 0)
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: '#5a3d26' }), count)
    const lows = new THREE.InstancedMesh(lowGeo, new THREE.MeshLambertMaterial({ flatShading: true }), count)
    const highs = new THREE.InstancedMesh(highGeo, new THREE.MeshLambertMaterial({ flatShading: true }), count)
    const rnd = seededRandom(seed)
    const mat = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const col = new THREE.Color()
    let k = 0
    let guard = 0
    while (k < count && guard++ < count * 50) {
      const r = minR + rnd() * (maxR - minR)
      const a = rnd() * Math.PI * 2
      const x = Math.cos(a) * r * 1.25
      const z = Math.sin(a) * r * 0.85
      if (inside(exclude, x, z)) continue
      const s = 0.75 + rnd() * 0.7
      q.setFromEuler(new THREE.Euler(0, rnd() * Math.PI, 0))
      mat.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s))
      trunks.setMatrixAt(k, mat)
      lows.setMatrixAt(k, mat)
      highs.setMatrixAt(k, mat)
      lows.setColorAt(k, col.setHSL(0.27 + rnd() * 0.07, 0.45 + rnd() * 0.2, 0.24 + rnd() * 0.1))
      highs.setColorAt(k, col.setHSL(0.28 + rnd() * 0.07, 0.45 + rnd() * 0.2, 0.28 + rnd() * 0.1))
      k++
    }
    trunks.count = lows.count = highs.count = k
    const g = new THREE.Group()
    g.add(trunks, lows, highs)
    return g
  }, [count, minR, maxR, exclude, seed])
  return <primitive object={group} />
}
