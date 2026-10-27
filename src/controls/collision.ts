import { FURNITURE, HALF_L, HALF_W, type Footprint } from '../scene/layout'

/**
 * 2D collision on the floor plane. The visitor is a vertical cylinder; every
 * blocker is an axis-aligned rectangle derived from the layout footprints, so
 * colliders always match the furniture. Anything taller than ~0.3 m blocks,
 * which covers every piece of furniture in the shop.
 */

export interface Rect {
  name: string
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  height: number
}

export const ROOM_BOUNDS = { minX: -HALF_W, maxX: HALF_W, minZ: -HALF_L, maxZ: HALF_L }

export function buildColliders(): Rect[] {
  return Object.entries(FURNITURE).map(([name, f]: [string, Footprint]) => ({ name, ...f }))
}

/** Push a circle at (x, z) out of all rects and keep it inside the room. Mutates and returns p. */
export function resolveCollisions(p: { x: number; z: number }, radius: number, rects: Rect[]) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false
    for (const r of rects) {
      // closest point on rect to circle centre
      const cx = Math.max(r.minX, Math.min(p.x, r.maxX))
      const cz = Math.max(r.minZ, Math.min(p.z, r.maxZ))
      const dx = p.x - cx
      const dz = p.z - cz
      const d2 = dx * dx + dz * dz
      if (d2 >= radius * radius) continue
      if (d2 > 1e-10) {
        const d = Math.sqrt(d2)
        p.x = cx + (dx / d) * radius
        p.z = cz + (dz / d) * radius
      } else {
        // centre inside the rect: push out along the shallowest axis
        const pen = [
          [p.x - r.minX + radius, -1, 0],
          [r.maxX - p.x + radius, 1, 0],
          [p.z - r.minZ + radius, 0, -1],
          [r.maxZ - p.z + radius, 0, 1],
        ].sort((a, b) => a[0] - b[0])[0]
        p.x += pen[0] * pen[1]
        p.z += pen[0] * pen[2]
      }
      moved = true
    }
    if (!moved) break
  }
  p.x = Math.max(ROOM_BOUNDS.minX + radius, Math.min(ROOM_BOUNDS.maxX - radius, p.x))
  p.z = Math.max(ROOM_BOUNDS.minZ + radius, Math.min(ROOM_BOUNDS.maxZ - radius, p.z))
  return p
}
