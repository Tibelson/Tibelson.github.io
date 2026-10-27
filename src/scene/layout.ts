/**
 * Room layout and coordinate conventions.
 *
 * Units are metres. Y is up. The origin sits on the finished floor at the
 * centre of the room. Facing into the shop from the entrance you look down -Z:
 *
 *            rear wall (z = -L/2)  -- sign, record shelving, counter
 *   left wall (x = -W/2)                      right wall (x = +W/2)
 *   brick, bins, project wall                 turntable, NOW PLAYING, racks
 *            front wall (z = +L/2) -- entrance door
 *
 * Every furniture footprint is declared here once. Components read their
 * position/size from this file and the collision system derives its blockers
 * from the same numbers, so moving an item here moves its collider too.
 */

export const ROOM = {
  width: 4.8,
  length: 8,
  height: 3,
  wallThickness: 0.15,
  floorThickness: 0.15,
} as const

export const HALF_W = ROOM.width / 2
export const HALF_L = ROOM.length / 2

export const PLAYER = {
  eyeHeight: 1.65,
  radius: 0.22,
  walkSpeed: 2.2,
  runSpeed: 3.6,
  spawn: { x: 0.6, z: 3.65, yaw: 0.1 },
} as const

/** Axis-aligned footprint on the floor plane plus a height. */
export interface Footprint {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  height: number
}

const fp = (minX: number, maxX: number, minZ: number, maxZ: number, height: number): Footprint => ({
  minX,
  maxX,
  minZ,
  maxZ,
  height,
})

export const FURNITURE = {
  /** Long angled bin unit against the brick wall. */
  leftWallBins: fp(-HALF_W, -1.85, -2.7, 3.3, 0.95),
  /** Dark double-lane island with the genre dividers (foreground of the reference). */
  island: fp(-1.05, -0.05, -1.5, 3.0, 0.92),
  /** Tall vinyl shelving against the rear wall. */
  rearShelving: fp(-1.95, 1.55, -HALF_L, -3.62, 2.2),
  /** Shop counter with cash register. */
  counter: fp(-1.45, 0.95, -3.05, -2.45, 1.0),
  /** Low cabinet carrying the turntable on the right wall. */
  turntableCabinet: fp(1.85, HALF_W, -2.3, -0.75, 0.85),
  /** Record rack along the right wall near the entrance. */
  rightRack: fp(1.95, HALF_W, -0.2, 3.2, 1.05),
  /** Small corner shelf unit in the rear-right corner. */
  cornerUnit: fp(1.75, HALF_W, -HALF_L, -3.35, 1.25),
} satisfies Record<string, Footprint>

/** Entrance opening in the front wall. */
export const DOOR = { centerX: 0.85, width: 1.0, height: 2.15 }

/** Wall-mounted shelf heights (top surface). */
export const WALL_SHELVES = {
  left: [1.3, 1.72],
  right: [1.55, 1.95],
}

export const PENDANTS: { x: number; z: number; drop: number; shade?: 'none' | 'dome' | 'globe' }[] = [
  { x: 0.75, z: 2.4, drop: 0.75, shade: 'none' },
  { x: -0.55, z: 0.6, drop: 0.85, shade: 'none' },
  { x: 0.9, z: -0.9, drop: 0.65, shade: 'globe' },
  { x: -0.25, z: -2.75, drop: 0.7, shade: 'dome' },
  { x: -1.9, z: -1.2, drop: 0.6, shade: 'none' },
  { x: 2.0, z: 1.4, drop: 0.7, shade: 'none' },
]

/** Visibility switches for architecture (overview mode hides some of these). */
export interface ArchitectureVisibility {
  ceiling: boolean
  frontWall: boolean
  leftWall: boolean
  rightWall: boolean
  rearWall: boolean
}

export const ALL_VISIBLE: ArchitectureVisibility = {
  ceiling: true,
  frontWall: true,
  leftWall: true,
  rightWall: true,
  rearWall: true,
}
