import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { worldBox, worldPlane } from './geometry'
import { DOOR, HALF_L, HALF_W, ROOM } from './layout'
import { TILE, boardsMaterial, brickMaterial, emissiveMaterial, floorMaterial, metalMaterial, plainMaterial, plasterMaterial, woodMaterial } from './materials'
import { Occluder } from '../interaction/Interactive'
import { WoodBox } from './assets/primitives'
import { StaticBatch } from './assets/StaticBatch'
import { labelTexture } from './textures/artwork'
import { cached, canvas, rng, toTexture } from './textures/util'

const H = ROOM.height
const T = ROOM.wallThickness

export type WallSide = 'left' | 'right' | 'rear' | 'front'

/**
 * Group that hides itself when the camera is on the outside of its wall, so
 * in overview (dollhouse) mode the near walls and their decor never block the
 * view. Inside the room every wall stays visible.
 */
export function CulledWall({ side, name, children }: { side: WallSide; name: string; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ camera }) => {
    if (!ref.current) return
    const p = camera.position
    const m = 0.05
    ref.current.visible =
      side === 'left' ? p.x > -HALF_W - m : side === 'right' ? p.x < HALF_W + m : side === 'rear' ? p.z > -HALF_L - m : p.z < HALF_L + m
  })
  return (
    <group ref={ref} name={name}>
      {children}
    </group>
  )
}

/** Interior wall surface (plane) backed by a solid shell box. Front faces into the room. */
function WallSurface({
  width,
  material,
  tile,
  position,
  rotationY,
  name,
}: {
  width: number
  material: THREE.Material
  tile: number
  position: [number, number, number]
  rotationY: number
  name: string
}) {
  return (
    <group name={name} position={position} rotation-y={rotationY}>
      <mesh geometry={worldPlane(width, H, tile)} position={[0, H / 2, 0]} material={material} receiveShadow />
      <mesh position={[0, H / 2, -T / 2 - 0.001]} material={plainMaterial('#2b2622', 0.9, 'WallShell')}>
        <boxGeometry args={[width + T * 2, H, T]} />
      </mesh>
      <Baseboard width={width} />
    </group>
  )
}

function Baseboard({ width, x = 0 }: { width: number; x?: number }) {
  return (
    <>
      <WoodBox name="Baseboard" size={[width, 0.12, 0.02]} position={[x, 0.06, 0.01]} tone="dark" shadows={false} />
      <WoodBox name="CrownTrim" size={[width, 0.06, 0.03]} position={[x, H - 0.03, 0.015]} tone="dark" shadows={false} />
    </>
  )
}

export function Floor() {
  return (
    <Occluder name="Floor">
      <mesh geometry={worldPlane(ROOM.width, ROOM.length, TILE.floor)} rotation-x={-Math.PI / 2} material={floorMaterial()} receiveShadow />
      <mesh position={[0, -ROOM.floorThickness / 2 - 0.001, 0]} material={plainMaterial('#1a140f', 0.9, 'FloorSlab')}>
        <boxGeometry args={[ROOM.width + T * 2, ROOM.floorThickness, ROOM.length + T * 2]} />
      </mesh>
    </Occluder>
  )
}

export function Ceiling() {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.y < H + 0.05
  })
  return (
    <group ref={ref} name="Ceiling">
      <StaticBatch>
        <mesh geometry={worldPlane(ROOM.width, ROOM.length, TILE.plaster)} rotation-x={Math.PI / 2} position={[0, H, 0]} material={plasterMaterial()} />
        {/* exposed beams across the room */}
        {[-2.6, 0, 2.6].map((z) => (
          <WoodBox key={z} name="CeilingBeam" size={[ROOM.width, 0.16, 0.14]} position={[0, H - 0.08, z]} tone="dark" shadows={false} />
        ))}
        {/* electrical conduit running the length of the room */}
        <mesh position={[0.35, H - 0.04, 0]} rotation-x={Math.PI / 2} material={metalMaterial('steel')}>
          <cylinderGeometry args={[0.014, 0.014, ROOM.length, 10]} />
        </mesh>
        {[-3.2, -1.3, 1.3, 3.2].map((z) => (
          <mesh key={z} position={[0.35, H - 0.02, z]} material={metalMaterial('steel')}>
            <boxGeometry args={[0.05, 0.04, 0.02]} />
          </mesh>
        ))}
      </StaticBatch>
    </group>
  )
}

export const LeftBrickWall = () => (
  <Occluder>
    <WallSurface name="Brickwork" width={ROOM.length} material={brickMaterial()} tile={TILE.brick} position={[-HALF_W, 0, 0]} rotationY={Math.PI / 2} />
  </Occluder>
)
export const RightBoardWall = () => (
  <Occluder>
    <WallSurface name="WoodenPanels" width={ROOM.length} material={boardsMaterial()} tile={TILE.boards} position={[HALF_W, 0, 0]} rotationY={-Math.PI / 2} />
  </Occluder>
)
export const RearBoardWall = () => (
  <Occluder>
    <WallSurface name="WoodenPanels" width={ROOM.width} material={boardsMaterial()} tile={TILE.boards} position={[0, 0, -HALF_L]} rotationY={0} />
  </Occluder>
)

/** Night-time street seen through the door and window: blurred warm bokeh. */
const streetTexture = () =>
  cached('street', () => {
    const { c, ctx } = canvas(512, 512)
    const g = ctx.createLinearGradient(0, 0, 0, 512)
    g.addColorStop(0, '#0c1424')
    g.addColorStop(0.6, '#1b2234')
    g.addColorStop(1, '#2a2522')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 512, 512)
    const r = rng(77)
    for (let i = 0; i < 40; i++) {
      const x = r() * 512
      const y = 150 + r() * 250
      const rad = 8 + r() * 30
      const gg = ctx.createRadialGradient(x, y, 0, x, y, rad)
      const col = r() < 0.7 ? '255,190,110' : '170,200,255'
      gg.addColorStop(0, `rgba(${col},${0.25 + r() * 0.35})`)
      gg.addColorStop(1, `rgba(${col},0)`)
      ctx.fillStyle = gg
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2)
    }
    return toTexture(c)
  })

const glassMaterial = () =>
  cached(
    'm-glass',
    () =>
      new THREE.MeshPhysicalMaterial({
        name: 'Glass_Window',
        color: '#c9d6db',
        roughness: 0.05,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
  )

/**
 * Front wall with the entrance door and a shop window. Built from separate
 * wall pieces around the openings so the openings are real holes.
 */
export function Entrance() {
  const doorL = DOOR.centerX - DOOR.width / 2
  const doorR = DOOR.centerX + DOOR.width / 2
  const win = { l: -2.0, r: -0.35, b: 0.85, t: 2.3 }
  const outside = useMemo(() => emissiveMaterial('#ffffff', 0.55, streetTexture()), [])
  const mat = boardsMaterial()
  // wall segments as [minX, maxX, minY, maxY]
  const pieces: [number, number, number, number][] = [
    [-HALF_W, win.l, 0, H],
    [win.l, win.r, 0, win.b],
    [win.l, win.r, win.t, H],
    [win.r, doorL, 0, H],
    [doorL, doorR, DOOR.height, H],
    [doorR, HALF_W, 0, H],
  ]
  const frame = woodMaterial('dark', true)
  return (
    <group name="Entrance" position={[0, 0, HALF_L]} rotation-y={Math.PI}>
      {/* rotated so local +Z faces into the room; local x is mirrored */}
      <Occluder name="FrontWall">
        {pieces.map(([a, b, c, d], i) => {
          const w = b - a
          const h = d - c
          const geo = worldPlane(w, h, TILE.boards).clone()
          // offset UVs so boards line up across pieces
          const uv = geo.getAttribute('uv') as THREE.BufferAttribute
          for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) + (a + HALF_W) / TILE.boards, uv.getY(k) + c / TILE.boards)
          return (
            <group key={i} position={[-(a + b) / 2, (c + d) / 2, 0]}>
              <mesh geometry={geo} material={mat} receiveShadow />
              <mesh position={[0, 0, -T / 2 - 0.001]} material={plainMaterial('#2b2622', 0.9, 'WallShell')}>
                <boxGeometry args={[w, h, T]} />
              </mesh>
            </group>
          )
        })}
      </Occluder>
      <Baseboard width={HALF_W - doorR} x={-(doorR + HALF_W) / 2} />
      <Baseboard width={doorL - -HALF_W} x={-(doorL - HALF_W) / 2} />

      {/* door frame and closed door */}
      <group name="Door" position={[-DOOR.centerX, 0, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} geometry={worldBox(0.07, DOOR.height, T + 0.04, TILE.wood)} position={[(s * (DOOR.width + 0.07)) / 2, DOOR.height / 2, 0]} material={frame} castShadow />
        ))}
        <mesh geometry={worldBox(DOOR.width + 0.14, 0.08, T + 0.04, TILE.wood)} position={[0, DOOR.height + 0.04, 0]} material={frame} />
        <group position={[0, 0, -0.02]}>
          <mesh geometry={worldBox(DOOR.width - 0.02, 1.0, 0.045, TILE.wood)} position={[0, 0.5, 0]} material={woodMaterial('honey')} castShadow />
          {/* glazed upper half */}
          {[
            [0, 2.11, DOOR.width - 0.02, 0.08],
            [-(DOOR.width - 0.08) / 2, 1.58, 0.06, 1.0],
            [(DOOR.width - 0.08) / 2, 1.58, 0.06, 1.0],
          ].map(([x, y, w, h], i) => (
            <mesh key={i} geometry={worldBox(w, h, 0.05, TILE.wood)} position={[x, y, 0]} material={woodMaterial('honey')} />
          ))}
          <mesh position={[0, 1.58, 0]} material={glassMaterial()}>
            <planeGeometry args={[DOOR.width - 0.14, 1.0]} />
          </mesh>
          {/* handle */}
          <mesh position={[DOOR.width / 2 - 0.12, 1.0, 0.05]} rotation-x={Math.PI / 2} material={metalMaterial('brass')}>
            <cylinderGeometry args={[0.012, 0.012, 0.09, 10]} />
          </mesh>
          {/* hanging card on the glass */}
          <mesh position={[0, 1.55, 0.03]} material={emissiveMaterial('#ffffff', 0.08, labelTexture('door-card', ['THANKS', 'FOR VISITING'], { w: 384, h: 192, bg: '#e9dcc0', fg: '#8c2a17' }))}>
            <planeGeometry args={[0.3, 0.15]} />
          </mesh>
        </group>
        <mesh position={[0, 1.4, -1.5]} material={outside}>
          <planeGeometry args={[3.5, 3]} />
        </mesh>
      </group>

      {/* shop window */}
      <group name="Window" position={[-(win.l + win.r) / 2, (win.b + win.t) / 2, 0]}>
        <mesh position={[0, 0, -0.03]} material={glassMaterial()}>
          <planeGeometry args={[win.r - win.l, win.t - win.b]} />
        </mesh>
        <mesh geometry={worldBox(win.r - win.l + 0.1, 0.06, 0.28, TILE.wood)} position={[0, -(win.t - win.b) / 2 - 0.03, 0.06]} material={frame} castShadow />
        <mesh geometry={worldBox(0.05, win.t - win.b, 0.06, TILE.wood)} position={[0, 0, -0.03]} material={frame} />
        <mesh position={[0, 0.2, -1.8]} material={outside}>
          <planeGeometry args={[4, 3]} />
        </mesh>
      </group>
    </group>
  )
}
