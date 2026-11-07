import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { seededRandom } from './coords'

type RGB = [number, number, number]

const COAT: RGB = [1, 1, 1]
const PINK: RGB = [0.93, 0.66, 0.66]
const DARK: RGB = [0.12, 0.12, 0.12]
const HORN: RGB = [0.85, 0.8, 0.68]

/**
 * Low-poly Holstein: body, head, ears, muzzle, legs, hooves, udder, tail, horns.
 * Faces +z. `spotMask` marks which parts receive procedural black patches.
 */
function buildBase() {
  const parts: THREE.BufferGeometry[] = []
  const add = (w: number, h: number, d: number, x: number, y: number, z: number, color: RGB, spots: number) => {
    const g = new THREE.BoxGeometry(w, h, d)
    g.translate(x, y, z)
    const n = g.attributes.position.count
    const col = new Float32Array(n * 3)
    for (let k = 0; k < n; k++) col.set(color, k * 3)
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setAttribute('spotMask', new THREE.BufferAttribute(new Float32Array(n).fill(spots), 1))
    parts.push(g)
  }
  add(0.32, 0.27, 0.62, 0, 0.37, 0, COAT, 1) // body
  add(0.19, 0.19, 0.23, 0, 0.49, 0.39, COAT, 1) // head
  add(0.13, 0.1, 0.08, 0, 0.44, 0.53, PINK, 0) // muzzle
  add(0.1, 0.045, 0.05, 0.14, 0.56, 0.35, DARK, 0) // ears
  add(0.1, 0.045, 0.05, -0.14, 0.56, 0.35, DARK, 0)
  add(0.03, 0.06, 0.03, 0.06, 0.61, 0.36, HORN, 0) // horns
  add(0.03, 0.06, 0.03, -0.06, 0.61, 0.36, HORN, 0)
  for (const x of [-0.1, 0.1])
    for (const z of [-0.21, 0.21]) {
      add(0.075, 0.22, 0.075, x, 0.14, z, COAT, 1) // leg
      add(0.08, 0.04, 0.08, x, 0.02, z, DARK, 0) // hoof
    }
  add(0.12, 0.06, 0.12, 0, 0.21, -0.12, PINK, 0) // udder
  add(0.03, 0.22, 0.03, 0, 0.31, -0.32, COAT, 1) // tail
  add(0.05, 0.06, 0.05, 0, 0.18, -0.32, DARK, 0) // tail tuft
  const merged = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())
  return merged
}

let base: THREE.BufferGeometry | null = null

/** Cow geometry with a per-instance `spotSeed` attribute (unique coat pattern per animal). */
export function makeCowGeometry(count: number, seed = 1) {
  base ??= buildBase()
  const g = base.clone()
  const rnd = seededRandom(seed)
  const seeds = new Float32Array(count)
  for (let k = 0; k < count; k++) seeds[k] = rnd() * 100
  g.setAttribute('spotSeed', new THREE.InstancedBufferAttribute(seeds, 1))
  return g
}

/** Lambert material whose shader paints Holstein patches from 3D value noise. */
export function makeCowMaterial() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true })
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float spotSeed;
attribute float spotMask;
varying vec3 vSpotP;
varying float vSpotMask;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vSpotP = position * vec3(5.5, 6.0, 4.2) + vec3(spotSeed * 1.37, spotSeed * 0.71, spotSeed * 2.13);
vSpotMask = spotMask;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vSpotP;
varying float vSpotMask;
float cowHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float cowNoise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cowHash(i), cowHash(i + vec3(1,0,0)), f.x), mix(cowHash(i + vec3(0,1,0)), cowHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(cowHash(i + vec3(0,0,1)), cowHash(i + vec3(1,0,1)), f.x), mix(cowHash(i + vec3(0,1,1)), cowHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float cowN = cowNoise(vSpotP) * 0.7 + cowNoise(vSpotP * 2.3) * 0.3;
float cowSpot = smoothstep(0.54, 0.58, cowN) * vSpotMask;
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.06, cowSpot);`,
      )
  }
  mat.customProgramCacheKey = () => 'holstein-v1'
  return mat
}
