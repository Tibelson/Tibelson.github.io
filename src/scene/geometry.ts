import * as THREE from 'three'
import { cached } from './textures/util'

/**
 * Box geometry with UVs in world units (metres / tile). Plain BoxGeometry maps
 * 0..1 onto every face regardless of size, which stretches wood grain on long
 * shelves. Here each face's UVs are scaled by its real extent and rotated so
 * the texture's V axis (the grain direction) follows the face's longest side.
 */
export function worldBox(w: number, h: number, d: number, tile = 0.8) {
  const key = `wbox-${w.toFixed(3)}-${h.toFixed(3)}-${d.toFixed(3)}-${tile}`
  return cached(key, () => {
    const g = new THREE.BoxGeometry(w, h, d)
    const uv = g.getAttribute('uv') as THREE.BufferAttribute
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 verts each)
    const dims: [number, number][] = [
      [d, h],
      [d, h],
      [w, d],
      [w, d],
      [w, h],
      [w, h],
    ]
    for (let f = 0; f < 6; f++) {
      const [du, dv] = dims[f]
      const swap = du > dv
      for (let k = 0; k < 4; k++) {
        const i = f * 4 + k
        const u = uv.getX(i) * du
        const v = uv.getY(i) * dv
        if (swap) uv.setXY(i, v / tile, u / tile)
        else uv.setXY(i, u / tile, v / tile)
      }
    }
    uv.needsUpdate = true
    return g
  })
}

/** Plane with UVs scaled to world size (for walls/floor). */
export function worldPlane(w: number, h: number, tile: number) {
  return cached(`wplane-${w}-${h}-${tile}`, () => {
    const g = new THREE.PlaneGeometry(w, h)
    const uv = g.getAttribute('uv') as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * h) / tile)
    return g
  })
}

/** Album sleeve: 315 mm square, a few mm thick. Front cover on +Z. */
export const SLEEVE = { size: 0.315, thickness: 0.0045 }
export const sleeveGeometry = () =>
  cached('sleeve', () => new THREE.BoxGeometry(SLEEVE.size, SLEEVE.size, SLEEVE.thickness))

/**
 * Vinyl disc: a flat ring with a spindle hole, extruded 2 mm. UVs are
 * re-projected top-down so a square label/groove texture maps on concentric.
 */
export const vinylGeometry = (radius = 0.15) =>
  cached(`vinyl-${radius}`, () => {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, radius, 0, Math.PI * 2, false)
    const hole = new THREE.Path()
    hole.absarc(0, 0, 0.0036, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.002, bevelEnabled: false, curveSegments: 96 })
    g.rotateX(-Math.PI / 2)
    const pos = g.getAttribute('position')
    const uv = g.getAttribute('uv') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / (2 * radius) + 0.5, -pos.getZ(i) / (2 * radius) + 0.5)
    g.computeVertexNormals()
    return g
  })
