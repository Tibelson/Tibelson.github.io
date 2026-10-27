import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ThreeElements } from '@react-three/fiber'
import { SLEEVE, sleeveGeometry, vinylGeometry, worldBox } from '../geometry'
import { TILE, instancedSleeveMaterial, paperMaterial, sleeveEdgeMaterial, woodMaterial, type WoodTone } from '../materials'
import { ATLAS_GRID, coverTexture, vinylTexture } from '../textures/artwork'
import { contactShadow } from '../textures/surfaces'
import { cached, rng } from '../textures/util'

type V3 = [number, number, number]
type MeshProps = Omit<ThreeElements['mesh'], 'ref'>

/** A box of wood with world-scaled grain. Position is the box centre. */
export function WoodBox({
  size,
  tone = 'honey',
  polished,
  shadows = true,
  ...props
}: MeshProps & { size: V3; tone?: WoodTone; polished?: boolean; shadows?: boolean }) {
  return (
    <mesh
      geometry={worldBox(size[0], size[1], size[2], TILE.wood)}
      material={woodMaterial(tone, polished)}
      castShadow={shadows}
      receiveShadow
      {...props}
    />
  )
}

/** Box from min/max corners: convenient when building from layout footprints. */
export function WoodSpan({ min, max, ...rest }: { min: V3; max: V3; tone?: WoodTone; polished?: boolean; name?: string }) {
  const size: V3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
  const pos: V3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
  return <WoodBox size={size} position={pos} {...rest} />
}

/** Cheap baked-looking contact shadow: a dark gradient decal on the floor. */
export function ContactBlob({ x, z, w, d, opacity = 0.55 }: { x: number; z: number; w: number; d: number; opacity?: number }) {
  const mat = useMemo(
    () =>
      cached(
        `m-blob-${opacity}`,
        () =>
          new THREE.MeshBasicMaterial({
            name: 'ContactShadow',
            map: contactShadow(),
            transparent: true,
            opacity,
            depthWrite: false,
            color: '#000',
            alphaMap: contactShadow(),
          }),
      ),
    [opacity],
  )
  return (
    <mesh position={[x, 0.002, z]} rotation-x={-Math.PI / 2} material={mat} renderOrder={1}>
      <planeGeometry args={[w * 1.25, d * 1.25]} />
    </mesh>
  )
}

/* ------------------------------------------------------------------------ */
/* Records                                                                  */
/* ------------------------------------------------------------------------ */

export interface SleeveInstance {
  position: V3
  /** Yaw-pitch-roll ('YXZ' order): Y turns the sleeve, X leans it back, Z rolls it. */
  rotation: V3
  /** Atlas cell 0..15. */
  cover: number
  /** Small size variation (1 = standard 12"). */
  scale?: number
}

/**
 * Renders many record sleeves with a single InstancedMesh. Each sleeve picks
 * its artwork from the shared atlas through a per-instance attribute.
 */
export function Sleeves({ items, name = 'Sleeves', shadows = false }: { items: SleeveInstance[]; name?: string; shadows?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geometry = useMemo(() => {
    // Clone so each run can carry its own aCover attribute.
    const g = sleeveGeometry().clone()
    g.setAttribute('aCover', new THREE.InstancedBufferAttribute(new Float32Array(items.map((i) => i.cover)), 1))
    return g
  }, [items])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const s = new THREE.Vector3()
    const p = new THREE.Vector3()
    items.forEach((it, i) => {
      e.set(it.rotation[0], it.rotation[1], it.rotation[2], 'YXZ')
      q.setFromEuler(e)
      const k = it.scale ?? 1
      s.set(k, k, 1)
      p.set(...it.position)
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    mesh.computeBoundingBox()
  }, [items])

  return (
    <instancedMesh
      ref={ref}
      name={name}
      args={[geometry, instancedSleeveMaterial(), items.length]}
      castShadow={shadows}
      receiveShadow
      frustumCulled
    />
  )
}

export const ATLAS_SIZE = ATLAS_GRID * ATLAS_GRID

/**
 * Records filed face-forward in a bin: a stack along +Z (front of the bin at
 * `front`), leaning back by `lean` radians, with small random variation.
 */
export function binRun({
  x,
  floorY,
  front,
  back,
  spacing = 0.0115,
  lean = 0.22,
  seed = 1,
  facing = 1,
}: {
  x: number
  floorY: number
  front: number
  back: number
  spacing?: number
  lean?: number
  seed?: number
  facing?: 1 | -1
}): SleeveInstance[] {
  const r = rng(seed)
  const out: SleeveInstance[] = []
  const half = SLEEVE.size / 2
  const len = Math.abs(front - back)
  const n = Math.floor((len - half * Math.sin(lean)) / spacing)
  for (let i = 0; i < n; i++) {
    const z = front - facing * (0.02 + i * spacing)
    const tilt = -(lean + (r() - 0.5) * 0.03)
    const scale = 0.985 + r() * 0.02
    out.push({
      position: [x + (r() - 0.5) * 0.012, floorY + half * Math.cos(lean) * scale + r() * 0.006, z - facing * half * Math.sin(lean)],
      rotation: [tilt, facing === 1 ? 0 : Math.PI, (r() - 0.5) * 0.02],
      cover: (r() * ATLAS_SIZE) | 0,
      scale,
    })
  }
  return out
}

/**
 * Records shelved spine-out: standing upright, packed along an axis. `along`
 * is the axis the shelf runs on; spines face `outward` (+1/-1 along the other axis).
 */
export function spineRun({
  start,
  end,
  y,
  depthPos,
  along = 'x',
  outward = 1,
  seed = 1,
  gapChance = 0.04,
  fill = 1,
}: {
  start: number
  end: number
  y: number
  depthPos: number
  along?: 'x' | 'z'
  outward?: 1 | -1
  seed?: number
  gapChance?: number
  fill?: number
}): SleeveInstance[] {
  const r = rng(seed)
  const out: SleeveInstance[] = []
  const half = SLEEVE.size / 2
  let p = start + 0.01
  const stop = start + (end - start) * fill
  let leanRun = 0
  while (p < stop - 0.01) {
    if (r() < gapChance) {
      // a gap, then the next few records lean into it
      p += 0.03 + r() * 0.05
      leanRun = 3
      continue
    }
    const t = SLEEVE.thickness + 0.0015 + r() * 0.002
    const scale = 0.97 + r() * 0.04
    const lean = leanRun > 0 ? -0.12 * leanRun : 0
    leanRun = Math.max(0, leanRun - 1)
    const sink = (1 - scale) * half
    const yy = y + half * scale - sink
    const depthJ = depthPos + (r() - 0.5) * 0.02
    if (along === 'x') {
      out.push({ position: [p, yy, depthJ], rotation: [lean, Math.PI / 2, 0], cover: (r() * ATLAS_SIZE) | 0, scale })
    } else {
      out.push({ position: [depthJ, yy, p], rotation: [lean * outward, 0, 0], cover: (r() * ATLAS_SIZE) | 0, scale })
    }
    p += t
  }
  return out
}

/* ------------------------------------------------------------------------ */

/** A single sleeve displayed face-out with its own high-resolution cover. */
export function FaceOutSleeve({
  cover,
  texture,
  coverKey,
  ...props
}: MeshProps & { cover?: number; texture?: THREE.Texture; coverKey?: string }) {
  const front = useMemo(() => {
    const tex = texture ?? coverTexture(cover ?? 0)
    return paperMaterial(tex, coverKey ?? `cover-${cover}`)
  }, [cover, texture, coverKey])
  const edge = sleeveEdgeMaterial()
  return (
    <mesh geometry={sleeveGeometry()} material={[edge, edge, edge, edge, front, edge]} castShadow receiveShadow {...props} />
  )
}

/** A 12" vinyl record with grooves and a paper label. Lies flat in the XZ plane. */
export function VinylDisc({ labelColor = '#c0392b', labelKey = 'default', ...props }: MeshProps & { labelColor?: string; labelKey?: string }) {
  const material = useMemo(
    () =>
      cached(`m-vinyl-${labelKey}`, () => {
        const t = vinylTexture(labelColor, labelKey)
        return new THREE.MeshPhysicalMaterial({
          name: 'Vinyl',
          map: t.map,
          bumpMap: t.bump,
          bumpScale: 0.6,
          roughness: 0.32,
          clearcoat: 0.6,
          clearcoatRoughness: 0.35,
        })
      }),
    [labelColor, labelKey],
  )
  return <mesh geometry={vinylGeometry()} material={material} castShadow receiveShadow {...props} />
}
