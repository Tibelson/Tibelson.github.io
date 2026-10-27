import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { categories, featuredProject, projects, type Project } from '../data/portfolio'
import { Interactive } from '../interaction/Interactive'
import { useStore } from '../state/store'
import { CulledWall, Ceiling, Entrance, Floor, LeftBrickWall, RearBoardWall, RightBoardWall } from './Architecture'
import { CashRegister, FairyLights, MainSign, Monitor, PendantLamp, Poster, Speaker, StandSign, TableLamp, Turntable } from './assets/fixtures'
import { FaceOutSleeve, Sleeves, VinylDisc, WoodBox, type SleeveInstance } from './assets/primitives'
import { StaticBatch } from './assets/StaticBatch'
import { Counter, CornerUnit, DividerCard, Island, LeftWallBins, RearShelving, RightRack, TurntableCabinet, WallShelf, islandGenreSlots } from './Furniture'
import { FURNITURE, HALF_L, HALF_W, PENDANTS, PLAYER, ROOM, WALL_SHELVES } from './layout'
import { emissiveMaterial } from './materials'
import { labelTexture, projectCover } from './textures/artwork'
import { buildColliders } from '../controls/collision'

/* ------------------------------------------------------------------------ */
/* Wall decor                                                               */
/* ------------------------------------------------------------------------ */

/** Face-out sleeves leaning on a wall shelf. Facing into the room. */
function ShelfSleeves({ side, y, zs, covers }: { side: 'left' | 'right'; y: number; zs: number[]; covers: number[] }) {
  const s = side === 'left' ? 1 : -1
  const lean = 0.12
  const x = s === 1 ? -HALF_W + 0.04 + 0.157 * Math.sin(lean) : HALF_W - 0.04 - 0.157 * Math.sin(lean)
  const items = useMemo<SleeveInstance[]>(
    () => zs.map((z, i) => ({ position: [x, y + 0.157, z], rotation: [-lean, (s * Math.PI) / 2, 0], cover: covers[i % covers.length] })),
    [x, y, zs, covers, s],
  )
  return <Sleeves name="ShelfSleeves" items={items} shadows />
}

/** A project record on the project wall. Slides forward when looked at. */
function ProjectRecord({ project, position }: { project: Project; position: [number, number, number] }) {
  const id = `record:${project.id}`
  const ref = useRef<THREE.Group>(null)
  const hovered = useStore((s) => s.hovered === id)
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const k = 1 - Math.exp(-dt * 10)
    g.position.z = THREE.MathUtils.lerp(g.position.z, hovered ? 0.07 : 0, k)
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, hovered ? -0.02 : -0.12, k)
  })
  return (
    <Interactive target={id} position={position}>
      {/* yaw to face the room; the inner group leans back and slides out on hover */}
      <group rotation-y={Math.PI / 2}>
        <group ref={ref} rotation-x={-0.12}>
          <FaceOutSleeve texture={projectCover(project)} coverKey={`project-${project.id}`} position={[0, 0.157, 0]} />
        </group>
      </group>
    </Interactive>
  )
}

function LeftWallDecor() {
  const [low, high] = WALL_SHELVES.left
  const z0 = FURNITURE.leftWallBins.minZ + 0.1
  const z1 = FURNITURE.leftWallBins.maxZ - 0.1
  // Projects fill the eye-level shelf from the entrance backwards.
  const slots = projects.map((_, i) => z1 - 0.25 - i * 0.55)
  const fillerStart = slots.length ? slots[slots.length - 1] - 0.5 : z1 - 0.25
  const filler: number[] = []
  for (let z = fillerStart; z > z0 + 0.15; z -= 0.42) filler.push(z)
  return (
    <group name="WallMounted">
      <WallShelf side="left" y={low} z0={z0} z1={z1} />
      <WallShelf side="left" y={high} z0={z0} z1={z1} />
      <ShelfSleeves side="left" y={low} zs={filler} covers={[3, 8, 12, 1, 6]} />
      <ShelfSleeves side="left" y={high} zs={Array.from({ length: 13 }, (_, i) => z1 - 0.2 - i * 0.44)} covers={[0, 5, 9, 14, 2, 7, 11, 4, 13, 10, 15]} />
      {/* small label strip under the project records */}
      <mesh position={[-HALF_W + 0.205, low - 0.015, z1 - 0.25 - ((projects.length - 1) * 0.55) / 2]} rotation-y={Math.PI / 2} material={emissiveMaterial('#ffffff', 0.1, labelTexture('projects-strip', ['PROJECTS · LOOK AT A RECORD TO PULL IT OUT'], { w: 1024, h: 48, bg: '#1d1a17', fg: '#f0e2c4', border: false }))}>
        <planeGeometry args={[Math.max(1, projects.length * 0.55), 0.026]} />
      </mesh>
      <group name="Posters">
        {[
          { z: 3.0, i: 0, s: [0.46, 0.68], f: 'black' },
          { z: 2.3, i: 3, s: [0.42, 0.62], f: 'none' },
          { z: 1.55, i: 1, s: [0.5, 0.74], f: 'wood' },
          { z: 0.75, i: 5, s: [0.44, 0.66], f: 'none' },
          { z: 0.0, i: 2, s: [0.46, 0.68], f: 'black' },
          { z: -0.8, i: 6, s: [0.42, 0.62], f: 'none' },
          { z: -1.6, i: 4, s: [0.5, 0.74], f: 'black' },
          { z: -2.4, i: 7, s: [0.44, 0.66], f: 'wood' },
          { z: -3.3, i: 9, s: [0.5, 0.74], f: 'none' },
        ].map((p) => (
          <Poster key={p.z} index={p.i} size={p.s as [number, number]} frame={p.f as 'black'} position={[-HALF_W + 0.012, 2.4 + (p.i % 2) * 0.06, p.z]} rotation-y={Math.PI / 2} rotation-z={(p.i % 3) * 0.008 - 0.008} />
        ))}
      </group>
    </group>
  )
}

function RearWallDecor() {
  const sh = FURNITURE.rearShelving
  return (
    <group name="WallMounted">
      <MainSign position={[0.4, 2.62, -HALF_L + 0.1]} />
      {/* album covers above the shelving, either side of the sign */}
      <Sleeves
        name="TopCovers"
        items={[-1.75, -1.33, -0.91, 1.35].map((x, i) => ({ position: [x, sh.height + 0.18, -HALF_L + 0.035], rotation: [-0.08, 0, 0], cover: [4, 10, 13, 15][i] }))}
      />
      <FairyLights from={[sh.minX + 0.05, sh.height - 0.02, sh.maxZ + 0.01]} to={[sh.maxX - 0.05, sh.height - 0.02, sh.maxZ + 0.01]} count={46} sag={0.05} />
      <Poster index={8} size={[0.36, 0.54]} frame="none" position={[-2.17, 1.7, -HALF_L + 0.01]} />
      <Poster index={10} size={[0.5, 0.72]} frame="black" position={[2.02, 2.1, -HALF_L + 0.02]} />
      <Poster index={11} size={[0.34, 0.5]} frame="none" position={[2.05, 1.5, -HALF_L + 0.01]} rotation-z={0.02} />
    </group>
  )
}

function RightWallDecor() {
  const [low, high] = WALL_SHELVES.right
  const rack = FURNITURE.rightRack
  return (
    <group name="WallMounted">
      <WallShelf side="right" y={low} z0={rack.minZ + 0.05} z1={rack.maxZ - 0.05} />
      <WallShelf side="right" y={high} z0={rack.minZ + 0.05} z1={rack.maxZ - 0.05} />
      <ShelfSleeves side="right" y={low} zs={Array.from({ length: 8 }, (_, i) => rack.maxZ - 0.3 - i * 0.42)} covers={[2, 9, 15, 6, 0, 12, 3, 8]} />
      <ShelfSleeves side="right" y={high} zs={Array.from({ length: 8 }, (_, i) => rack.maxZ - 0.3 - i * 0.42)} covers={[11, 4, 7, 14, 1, 10, 5, 13]} />
      <group name="Posters">
        {/* large album-art display between the corner unit and turntable */}
        <Poster index={12} size={[0.78, 1.1]} frame="wood" position={[HALF_W - 0.02, 1.65, -2.83]} rotation-y={-Math.PI / 2} />
        {[
          { z: 2.7, i: 13 },
          { z: 1.9, i: 14 },
          { z: 1.1, i: 15 },
          { z: 0.3, i: 16 },
          { z: -1.0, i: 17 },
        ].map((p) => (
          <Poster key={p.z} index={p.i} size={[0.42, 0.62]} frame={p.i % 2 ? 'none' : 'black'} position={[HALF_W - 0.012, 2.52, p.z]} rotation-y={-Math.PI / 2} />
        ))}
        <Poster index={18} size={[0.4, 0.58]} frame="black" position={[HALF_W - 0.012, 2.35, -2.0]} rotation-y={-Math.PI / 2} />
      </group>
    </group>
  )
}

function FrontWallDecor() {
  return (
    <group name="WallMounted">
      <Poster index={19} size={[0.4, 0.6]} frame="none" position={[0.0, 1.6, HALF_L - 0.01]} rotation-y={Math.PI} />
      <Poster index={20} size={[0.5, 0.74]} frame="black" position={[1.88, 1.65, HALF_L - 0.02]} rotation-y={Math.PI} />
      <Poster index={21} size={[0.6, 0.4]} frame="wood" position={[-1.18, 2.62, HALF_L - 0.02]} rotation-y={Math.PI} />
    </group>
  )
}

/* ------------------------------------------------------------------------ */
/* Interactive objects                                                      */
/* ------------------------------------------------------------------------ */

function InteractiveObjects() {
  const c = FURNITURE.counter
  const tc = FURNITURE.turntableCabinet
  const slots = islandGenreSlots(categories.length)
  const z1 = FURNITURE.leftWallBins.maxZ - 0.1
  return (
    <group name="InteractiveObjects">
      <group name="ProjectRecords">
        {projects.map((p, i) => (
          <ProjectRecord key={p.id} project={p} position={[-HALF_W + 0.045, WALL_SHELVES.left[0], z1 - 0.25 - i * 0.55]} />
        ))}
      </group>
      <group name="GenreDividers">
        {categories.map((cat, i) => (
          <Interactive key={cat.id} target={`genre:${cat.id}`}>
            <DividerCard text={cat.genre} width={slots[i].width} position={slots[i].position} dark={i % 2 === 1} />
          </Interactive>
        ))}
      </group>
      <Interactive target="sign:main">
        <mesh position={[0.4, 2.62, -HALF_L + 0.17]}>
          <boxGeometry args={[1.42, 0.5, 0.02]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </Interactive>
      <Interactive target="counter:register" name="ExperienceDisplay">
        <CashRegister position={[0.45, c.height + 0.08, (c.minZ + c.maxZ) / 2 + 0.05]} rotation-y={-0.15} />
      </Interactive>
      <Interactive target="sign:support-indie" name="AboutSign">
        <StandSign lines={['SUPPORT', 'INDIE', 'MUSIC']} w={0.26} h={0.3} position={[-0.42, c.height, c.maxZ - 0.15]} rotation-y={0.1} />
      </Interactive>
      <Interactive target="turntable:contact" name="ContactTurntable">
        <Turntable position={[(tc.minX + tc.maxX) / 2 + 0.02, tc.height, (tc.minZ + tc.maxZ) / 2]} rotation-y={-Math.PI / 2} />
      </Interactive>
      <Interactive target="display:now-playing" name="NowPlayingDisplay">
        <group position={[HALF_W - 0.03, 1.5, (tc.minZ + tc.maxZ) / 2]} rotation-y={-Math.PI / 2}>
          <WoodBox size={[0.44, 0.44, 0.04]} position={[0, 0, -0.01]} tone="dark" polished />
          <FaceOutSleeve texture={projectCover(featuredProject)} coverKey={`project-${featuredProject.id}`} position={[0, 0, 0.013]} />
          <mesh position={[0, 0.3, 0]} material={emissiveMaterial('#ffffff', 0.25, labelTexture('now-playing', ['NOW PLAYING'], { w: 512, h: 96, bg: '#2a1f17', fg: '#f3dfb3' }))}>
            <boxGeometry args={[0.44, 0.08, 0.02]} />
          </mesh>
        </group>
      </Interactive>
      <Interactive target="shelf:projects">
        {/* invisible hit area over the rear shelving's records */}
        <mesh position={[(FURNITURE.rearShelving.minX + FURNITURE.rearShelving.maxX) / 2, 1.1, FURNITURE.rearShelving.maxZ + 0.01]}>
          <planeGeometry args={[FURNITURE.rearShelving.maxX - FURNITURE.rearShelving.minX, 2.1]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      </Interactive>
    </group>
  )
}

/** Clutter on the counter and other surfaces. Not interactive. */
function CounterTop() {
  const c = FURNITURE.counter
  const lw = FURNITURE.leftWallBins
  return (
    <group name="Countertop">
      <Monitor position={[-0.95, c.height, (c.minZ + c.maxZ) / 2]} rotation-y={0.25} />
      <TableLamp position={[-1.3, c.height, c.minZ + 0.18]} />
      {/* a short stack of records lying flat, and one out of its sleeve */}
      <Sleeves
        name="CounterStack"
        items={[0, 1, 2, 3].map((i) => ({ position: [0.0, c.height + 0.003 + i * 0.005, (c.minZ + c.maxZ) / 2 + 0.02], rotation: [-Math.PI / 2, i * 0.07, 0], cover: (i * 5) % 16 }))}
      />
      <VinylDisc position={[-0.04, c.height + 0.025, (c.minZ + c.maxZ) / 2 - 0.01]} rotation-y={0.4} labelColor="#2b6f8a" labelKey="counter" />
      {/* lamp and a crate on the closed-top end of the wall bins */}
      <TableLamp position={[(lw.minX + lw.maxX) / 2, lw.height + 0.015, lw.minZ + 0.2]} shadeColor="#d9b98a" />
      <Speaker position={[(FURNITURE.cornerUnit.minX + FURNITURE.cornerUnit.maxX) / 2 + 0.05, FURNITURE.cornerUnit.height, -HALF_L + 0.25]} />
      {[-1, 1].map((s) => (
        <Speaker key={s} position={[FURNITURE.turntableCabinet.maxX - 0.15, FURNITURE.turntableCabinet.height, (FURNITURE.turntableCabinet.minZ + FURNITURE.turntableCabinet.maxZ) / 2 + s * 0.55]} rotation-y={-Math.PI / 2} scale={0.8} />
      ))}
      {/* counter-front gig posters */}
      {[-1.15, -0.55, 0.05, 0.65].map((x, i) => (
        <Poster key={x} index={22 + i} size={[0.44, 0.66]} frame="none" position={[x, 0.5, c.maxZ - 0.019]} rotation-z={(i - 1.5) * 0.01} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------------ */

function Lighting() {
  const quality = useStore((s) => s.quality)
  return (
    <group name="Lighting">
      <group name="AmbientLighting">
        <hemisphereLight args={['#ffd9ae', '#2a170c', quality === 'low' ? 0.4 : 0.3]} />
        <ambientLight color="#ffcf9a" intensity={0.05} />
      </group>
      {/* Local reflections from warm "light cards" so metal and vinyl have something to reflect. */}
      <Environment resolution={64} frames={1} environmentIntensity={0.35}>
        <Lightformer form="rect" intensity={2} color="#ffbf80" position={[0, 2.9, 0]} rotation-x={Math.PI / 2} scale={[4, 7, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ffe2b8" position={[0.4, 2.6, -3.9]} scale={[1.4, 0.5, 1]} />
        <Lightformer form="rect" intensity={0.4} color="#6a4a30" position={[0, 0, 0]} rotation-x={-Math.PI / 2} scale={[5, 8, 1]} />
      </Environment>
    </group>
  )
}

function CeilingFixtures() {
  return (
    <group name="CeilingFixtures">
      <group name="PendantLights">
        {PENDANTS.map((p, i) => (
          <PendantLamp key={i} position={[p.x, ROOM.height, p.z]} drop={p.drop} shade={p.shade} shadowSpot={i === 1 || i === 3} intensity={i === 3 ? 2.6 : 3.2} />
        ))}
      </group>
    </group>
  )
}

/** Spawn point and debug-visible collision volumes. */
function Navigation() {
  const debug = useMemo(() => new URLSearchParams(location.search).has('colliders'), [])
  const colliders = useMemo(() => buildColliders(), [])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff0044', wireframe: true }), [])
  return (
    <group name="Navigation">
      <object3D name="SpawnPoint" position={[PLAYER.spawn.x, PLAYER.eyeHeight, PLAYER.spawn.z]} rotation-y={PLAYER.spawn.yaw} />
      <group name="CollisionVolumes" visible={debug}>
        {colliders.map((r) => (
          <mesh key={r.name} name={`Collider_${r.name}`} material={mat} position={[(r.minX + r.maxX) / 2, r.height / 2, (r.minZ + r.maxZ) / 2]}>
            <boxGeometry args={[r.maxX - r.minX, r.height, r.maxZ - r.minZ]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** The whole shop. Hierarchy and names follow docs/SCENE.md. */
export function Store() {
  const genres = useMemo(() => categories.map((c) => ({ id: c.id, label: c.genre })), [])
  return (
    <group name="VinylStore">
      <group name="Architecture">
        <Floor />
        <Ceiling />
        <CulledWall side="front" name="Entrance">
          <StaticBatch>
            <Entrance />
            <FrontWallDecor />
          </StaticBatch>
        </CulledWall>
      </group>
      <group name="LeftWall">
        <CulledWall side="left" name="LeftWallSurface">
          <StaticBatch>
            <LeftBrickWall />
            <LeftWallDecor />
          </StaticBatch>
        </CulledWall>
        <StaticBatch>
          <LeftWallBins />
          <Island genres={genres} />
        </StaticBatch>
      </group>
      <group name="RearWall">
        <CulledWall side="rear" name="RearWallSurface">
          <StaticBatch>
            <RearBoardWall />
            <RearWallDecor />
          </StaticBatch>
        </CulledWall>
        <StaticBatch>
          <RearShelving />
          <Counter />
          <CornerUnit />
        </StaticBatch>
      </group>
      <group name="RightWall">
        <CulledWall side="right" name="RightWallSurface">
          <StaticBatch>
            <RightBoardWall />
            <RightWallDecor />
          </StaticBatch>
        </CulledWall>
        <StaticBatch>
          <TurntableCabinet />
          <RightRack />
        </StaticBatch>
      </group>
      <StaticBatch>
        <CounterTop />
        <CeilingFixtures />
      </StaticBatch>
      <InteractiveObjects />
      <Navigation />
      <Lighting />
    </group>
  )
}
