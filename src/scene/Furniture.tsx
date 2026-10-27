import { useMemo } from 'react'
import { FURNITURE, HALF_W, type Footprint } from './layout'
import { ContactBlob, Sleeves, WoodSpan, binRun, spineRun, type SleeveInstance } from './assets/primitives'
import { paperMaterial, woodMaterial, type WoodTone } from './materials'
import { labelTexture } from './textures/artwork'
import { Occluder } from '../interaction/Interactive'
import { rng } from './textures/util'

const P = 0.02 // panel thickness

/** Plinth, sides, end panels and top rim of a bin unit, shared by the wall bins and the island. */
function BinCarcass({ f, trayY, tone, lanes }: { f: Footprint; trayY: number; tone: WoodTone; lanes: number }) {
  const { minX, maxX, minZ, maxZ, height } = f
  const laneW = (maxX - minX) / lanes
  return (
    <Occluder name="Carcass">
      {/* plinth */}
      <WoodSpan min={[minX + 0.02, 0, minZ + 0.02]} max={[maxX - 0.02, 0.06, maxZ - 0.02]} tone="black" />
      {/* long sides */}
      <WoodSpan min={[minX, 0.06, minZ]} max={[minX + P, height, maxZ]} tone={tone} />
      <WoodSpan min={[maxX - P, 0.06, minZ]} max={[maxX, height, maxZ]} tone={tone} />
      {/* end panels */}
      <WoodSpan min={[minX, 0.06, maxZ - P]} max={[maxX, height - 0.04, maxZ]} tone={tone} />
      <WoodSpan min={[minX, 0.06, minZ]} max={[maxX, height, minZ + P]} tone={tone} />
      {/* bin tray and lane separators */}
      <WoodSpan min={[minX + P, trayY - P, minZ + P]} max={[maxX - P, trayY, maxZ - P]} tone={tone} />
      {Array.from({ length: lanes - 1 }, (_, i) => (
        <WoodSpan key={i} min={[minX + laneW * (i + 1) - P / 2, trayY, minZ]} max={[minX + laneW * (i + 1) + P / 2, height - 0.06, maxZ]} tone={tone} />
      ))}
      {/* rim caps */}
      <WoodSpan min={[minX - 0.005, height, minZ]} max={[minX + P + 0.005, height + 0.015, maxZ]} tone={tone} polished />
      <WoodSpan min={[maxX - P - 0.005, height, minZ]} max={[maxX + 0.005, height + 0.015, maxZ]} tone={tone} polished />
    </Occluder>
  )
}

/** Divider card that sticks up out of a bin. Origin = bottom centre, faces +Z. */
export function DividerCard({ text, width, position, dark = false }: { text: string; width: number; position: [number, number, number]; dark?: boolean }) {
  const mat = useMemo(() => {
    const tex = labelTexture(`div-${text}-${dark}`, [text], { w: 512, h: 112, bg: dark ? '#1c1a18' : '#efe6d2', fg: dark ? '#efe6d2' : '#1c1a18', border: false })
    return paperMaterial(tex, `div-${text}-${dark}`)
  }, [text, dark])
  const edge = woodMaterial('pale')
  return (
    <mesh position={[position[0], position[1] + 0.09, position[2]]} rotation-x={-0.12} material={[edge, edge, edge, edge, mat, mat]} castShadow>
      <boxGeometry args={[width, 0.16, 0.004]} />
    </mesh>
  )
}

/* ------------------------------------------------------------------------ */

const LEFT_BIN_LABELS = ['NEW IN', 'PUNK', 'SHOEGAZE', 'SOUL', 'JAZZ', '£5 BIN']

/** Angled-record bin unit along the brick wall, with spine-out storage beneath. */
export function LeftWallBins() {
  const f = FURNITURE.leftWallBins
  const trayY = 0.62
  const cabinetEnd = f.minZ + 0.45 // closed-top section at the rear end
  const laneX = (f.minX + f.maxX) / 2
  const sections = LEFT_BIN_LABELS.length
  const secLen = (f.maxZ - cabinetEnd) / sections
  const top = useMemo(() => {
    const items: SleeveInstance[] = []
    for (let s = 0; s < sections; s++) {
      const front = f.maxZ - s * secLen - P
      items.push(...binRun({ x: laneX, floorY: trayY, front, back: front - secLen + P, seed: 100 + s, lean: 0.25 }))
    }
    return items
  }, [f, laneX, secLen, sections])
  const below = useMemo(
    () => [
      ...spineRun({ start: f.minZ + 0.05, end: f.maxZ - 0.05, y: 0.08, depthPos: f.minX + 0.27, along: 'z', seed: 7 }),
      ...spineRun({ start: f.minZ + 0.05, end: f.maxZ - 0.05, y: 0.08 + 0.27, depthPos: f.minX + 0.27, along: 'z', seed: 8, fill: 0.9 }),
    ],
    [f],
  )
  return (
    <group name="RecordBins">
      <BinCarcass f={f} trayY={trayY} tone="honey" lanes={1} />
      {/* storage shelf between the two spine-out tiers */}
      <WoodSpan min={[f.minX + P, 0.34, f.minZ + P]} max={[f.maxX - P, 0.35, f.maxZ - P]} tone="honey" />
      {/* closed top over the rear cabinet section */}
      <WoodSpan min={[f.minX, f.height - 0.02, f.minZ]} max={[f.maxX, f.height + 0.015, cabinetEnd]} tone="honey" polished />
      {Array.from({ length: sections - 1 }, (_, s) => (
        <WoodSpan key={s} min={[f.minX + P, trayY, f.maxZ - (s + 1) * secLen - 0.008]} max={[f.maxX - P, trayY + 0.12, f.maxZ - (s + 1) * secLen + 0.008]} tone="honey" />
      ))}
      <Sleeves name="BinRecords" items={top} />
      <Sleeves name="StoredRecords" items={below} />
      {LEFT_BIN_LABELS.map((l, s) => (
        <DividerCard key={l} text={l} width={0.36} position={[laneX, trayY + 0.2, f.maxZ - s * secLen - 0.05]} />
      ))}
      <ContactBlob x={laneX} z={(f.minZ + f.maxZ) / 2} w={f.maxX - f.minX} d={f.maxZ - f.minZ} />
    </group>
  )
}

/** Dark central island: two lanes of bins over spine-out cubbies, split into four genre sections. */
export function Island({ genres }: { genres: { id: string; label: string }[] }) {
  const f = FURNITURE.island
  const trayY = 0.6
  const lanes = [f.minX + (f.maxX - f.minX) * 0.25, f.minX + (f.maxX - f.minX) * 0.75]
  const secLen = (f.maxZ - f.minZ) / genres.length
  const top = useMemo(() => {
    const items: SleeveInstance[] = []
    genres.forEach((_, s) => {
      const front = f.maxZ - s * secLen - P
      lanes.forEach((x, li) => items.push(...binRun({ x, floorY: trayY, front, back: front - secLen + P * 2, seed: 300 + s * 7 + li, lean: 0.24 })))
    })
    return items
  }, [f, secLen, genres.length])
  const cubbies = useMemo(() => {
    const out: SleeveInstance[] = []
    for (const [i, y] of [0.07, 0.34].entries()) {
      out.push(...spineRun({ start: f.minZ + 0.03, end: f.maxZ - 0.03, y, depthPos: f.minX + 0.2, along: 'z', seed: 40 + i, fill: 0.95 }))
      out.push(...spineRun({ start: f.minZ + 0.03, end: f.maxZ - 0.03, y, depthPos: f.maxX - 0.2, along: 'z', seed: 50 + i, fill: 0.92 }))
    }
    return out
  }, [f])
  return (
    <group name="Island">
      <BinCarcass f={f} trayY={trayY} tone="black" lanes={2} />
      {/* central spine and cubby shelf */}
      <WoodSpan min={[(f.minX + f.maxX) / 2 - P / 2, 0.06, f.minZ]} max={[(f.minX + f.maxX) / 2 + P / 2, trayY - P, f.maxZ]} tone="black" />
      <WoodSpan min={[f.minX + P, 0.325, f.minZ + P]} max={[f.maxX - P, 0.335, f.maxZ - P]} tone="black" />
      {/* cubby verticals every ~0.56 m so the base reads as individual compartments */}
      {Array.from({ length: Math.floor((f.maxZ - f.minZ) / 0.56) }, (_, i) => {
        const z = f.minZ + 0.56 * (i + 1)
        return <WoodSpan key={i} min={[f.minX + P, 0.06, z - P / 2]} max={[f.maxX - P, trayY - P, z + P / 2]} tone="black" />
      })}
      {genres.slice(1).map((_, s) => (
        <WoodSpan key={s} min={[f.minX + P, trayY, f.maxZ - (s + 1) * secLen - 0.008]} max={[f.maxX - P, trayY + 0.12, f.maxZ - (s + 1) * secLen + 0.008]} tone="black" />
      ))}
      <Sleeves name="BinRecords" items={top} />
      <Sleeves name="CubbyRecords" items={cubbies} />
      <ContactBlob x={(f.minX + f.maxX) / 2} z={(f.minZ + f.maxZ) / 2} w={f.maxX - f.minX} d={f.maxZ - f.minZ} opacity={0.7} />
    </group>
  )
}

/** Where the island's interactive genre cards sit, so InteractiveObjects can place them. */
export function islandGenreSlots(count: number) {
  const f = FURNITURE.island
  const secLen = (f.maxZ - f.minZ) / count
  return Array.from({ length: count }, (_, s) => ({
    position: [(f.minX + f.maxX) / 2, 0.8, f.maxZ - s * secLen - 0.05] as [number, number, number],
    width: f.maxX - f.minX - 0.08,
  }))
}

/* ------------------------------------------------------------------------ */

/** Three tall shelving units of spine-out records against the rear wall. */
export function RearShelving() {
  const f = FURNITURE.rearShelving
  const units = 3
  const uw = (f.maxX - f.minX) / units
  const levels = [0.08, 0.5, 0.92, 1.34, 1.76]
  const depthMid = (f.minZ + f.maxZ) / 2 + 0.01
  const records = useMemo(() => {
    const r = rng(99)
    const out: SleeveInstance[] = []
    for (let u = 0; u < units; u++) {
      const x0 = f.minX + u * uw + P
      const x1 = f.minX + (u + 1) * uw - P
      const mid = (x0 + x1) / 2
      levels.forEach((y, li) => {
        for (const [a, b] of [
          [x0, mid - P / 2],
          [mid + P / 2, x1],
        ]) {
          out.push(...spineRun({ start: a, end: b, y: y + P, depthPos: depthMid, along: 'x', seed: u * 100 + li * 10 + a * 7, fill: 0.55 + r() * 0.45 }))
        }
      })
    }
    return out
  }, [f, uw])
  return (
    <group name="RecordShelves">
      <Occluder name="ShelfCarcass">
        {Array.from({ length: units }, (_, u) => {
          const x0 = f.minX + u * uw
          const x1 = x0 + uw
          const mid = (x0 + x1) / 2
          return (
            <group key={u} name={`ShelfUnit_${u + 1}`}>
              <WoodSpan min={[x0, 0, f.minZ]} max={[x0 + P, f.height, f.maxZ]} tone="honey" />
              <WoodSpan min={[x1 - P, 0, f.minZ]} max={[x1, f.height, f.maxZ]} tone="honey" />
              <WoodSpan min={[x0, 0, f.minZ]} max={[x1, f.height, f.minZ + 0.012]} tone="dark" />
              <WoodSpan min={[mid - P / 2, 0, f.minZ]} max={[mid + P / 2, f.height, f.maxZ - 0.01]} tone="honey" />
              {[...levels, f.height - P].map((y) => (
                <WoodSpan key={y} min={[x0 + P, y, f.minZ]} max={[x1 - P, y + P, f.maxZ]} tone="honey" />
              ))}
              {/* plinth kick */}
              <WoodSpan min={[x0 + P, 0, f.maxZ - 0.03]} max={[x1 - P, 0.08, f.maxZ]} tone="dark" />
            </group>
          )
        })}
      </Occluder>
      <Sleeves name="ShelvedRecords" items={records} />
    </group>
  )
}

/** Shop counter carcass. Objects on top are placed by the scene. */
export function Counter() {
  const f = FURNITURE.counter
  return (
    <Occluder name="Counter">
      <WoodSpan min={[f.minX + 0.03, 0, f.minZ + 0.05]} max={[f.maxX - 0.03, f.height - 0.04, f.maxZ - 0.02]} tone="honey" />
      <WoodSpan min={[f.minX - 0.03, f.height - 0.04, f.minZ]} max={[f.maxX + 0.03, f.height, f.maxZ + 0.04]} tone="dark" polished />
      <WoodSpan min={[f.minX + 0.03, 0, f.maxZ - 0.04]} max={[f.maxX - 0.03, 0.08, f.maxZ - 0.02]} tone="black" />
      <ContactBlob x={(f.minX + f.maxX) / 2} z={(f.minZ + f.maxZ) / 2} w={f.maxX - f.minX} d={f.maxZ - f.minZ} />
    </Occluder>
  )
}

/** Low open cabinet for the turntable, opening towards the aisle (-X). */
export function TurntableCabinet() {
  const f = FURNITURE.turntableCabinet
  const records = useMemo(
    () => [
      ...spineRun({ start: f.minZ + 0.03, end: f.maxZ - 0.03, y: 0.06, depthPos: (f.minX + f.maxX) / 2, along: 'z', seed: 61 }),
      ...spineRun({ start: f.minZ + 0.03, end: f.maxZ - 0.03, y: 0.44, depthPos: (f.minX + f.maxX) / 2, along: 'z', seed: 62, fill: 0.8 }),
    ],
    [f],
  )
  return (
    <group name="StorageCabinet">
      <Occluder>
        <WoodSpan min={[f.minX, 0, f.minZ]} max={[f.maxX, 0.06, f.maxZ]} tone="dark" />
        <WoodSpan min={[f.minX, 0.42, f.minZ]} max={[f.maxX, 0.44, f.maxZ]} tone="dark" />
        <WoodSpan min={[f.minX - 0.02, f.height - 0.03, f.minZ - 0.02]} max={[f.maxX, f.height, f.maxZ + 0.02]} tone="dark" polished />
        <WoodSpan min={[f.minX, 0, f.minZ]} max={[f.maxX, f.height - 0.03, f.minZ + P]} tone="dark" />
        <WoodSpan min={[f.minX, 0, f.maxZ - P]} max={[f.maxX, f.height - 0.03, f.maxZ]} tone="dark" />
        <WoodSpan min={[f.maxX - 0.012, 0, f.minZ]} max={[f.maxX, f.height, f.maxZ]} tone="dark" />
      </Occluder>
      <Sleeves name="CabinetRecords" items={records} />
      <ContactBlob x={(f.minX + f.maxX) / 2} z={(f.minZ + f.maxZ) / 2} w={f.maxX - f.minX} d={f.maxZ - f.minZ} />
    </group>
  )
}

/** Whitewashed open rack along the right wall near the entrance. */
export function RightRack() {
  const f = FURNITURE.rightRack
  const tiers = [0.05, 0.38, 0.71]
  const sections = 4
  const secLen = (f.maxZ - f.minZ) / sections
  const records = useMemo(() => {
    const out: SleeveInstance[] = []
    tiers.forEach((y, ti) => {
      for (let s = 0; s < sections; s++) {
        const a = f.minZ + s * secLen + P
        out.push(...spineRun({ start: a, end: a + secLen - P, y: y + P, depthPos: (f.minX + f.maxX) / 2 + 0.03, along: 'z', seed: 500 + ti * 10 + s, fill: 0.7 + ((s + ti) % 3) * 0.12 }))
      }
    })
    return out
  }, [f, secLen])
  const topRow = useMemo(() => {
    const r = rng(808)
    return Array.from({ length: 6 }, (_, i): SleeveInstance => ({
      position: [HALF_W - 0.06, f.height + 0.16, f.minZ + 0.35 + i * 0.55],
      rotation: [-0.16, -Math.PI / 2, 0],
      cover: (r() * 16) | 0,
    }))
  }, [f])
  return (
    <group name="RightRack">
      <Occluder>
        {[...tiers, f.height - P].map((y) => (
          <WoodSpan key={y} min={[f.minX, y, f.minZ]} max={[f.maxX, y + P, f.maxZ]} tone="pale" />
        ))}
        {Array.from({ length: sections + 1 }, (_, s) => {
          const z = f.minZ + s * secLen
          return <WoodSpan key={s} min={[f.minX, 0, Math.max(f.minZ, z - P / 2)]} max={[f.maxX, f.height, Math.min(f.maxZ, z + P / 2)]} tone="pale" />
        })}
      </Occluder>
      <Sleeves name="RackRecords" items={records} />
      <Sleeves name="RackTopSleeves" items={topRow} />
      <ContactBlob x={(f.minX + f.maxX) / 2} z={(f.minZ + f.maxZ) / 2} w={f.maxX - f.minX} d={f.maxZ - f.minZ} />
    </group>
  )
}

/** Small cabinet in the rear-right corner. */
export function CornerUnit() {
  const f = FURNITURE.cornerUnit
  const records = useMemo(() => spineRun({ start: f.minX + 0.03, end: f.maxX - 0.03, y: 0.5, depthPos: (f.minZ + f.maxZ) / 2, along: 'x', seed: 71 }), [f])
  return (
    <group name="CornerUnit">
      <Occluder>
        <WoodSpan min={[f.minX, 0, f.minZ]} max={[f.minX + P, f.height, f.maxZ]} tone="honey" />
        <WoodSpan min={[f.minX, 0, f.minZ]} max={[f.maxX, 0.48, f.maxZ]} tone="honey" />
        <WoodSpan min={[f.minX, 0.48, f.minZ]} max={[f.maxX, 0.5, f.maxZ]} tone="honey" />
        <WoodSpan min={[f.minX, f.height - P, f.minZ]} max={[f.maxX, f.height, f.maxZ]} tone="honey" polished />
      </Occluder>
      <Sleeves name="CornerRecords" items={records} />
      <ContactBlob x={(f.minX + f.maxX) / 2} z={(f.minZ + f.maxZ) / 2} w={f.maxX - f.minX} d={f.maxZ - f.minZ} />
    </group>
  )
}

/**
 * Wall-mounted plank shelf with iron brackets. `side` decides which wall.
 * y = top surface height, [z0, z1] = extent along the wall.
 */
export function WallShelf({ side, y, z0, z1, depth = 0.2 }: { side: 'left' | 'right'; y: number; z0: number; z1: number; depth?: number }) {
  const wx = side === 'left' ? -HALF_W : HALF_W
  const s = side === 'left' ? 1 : -1
  const brackets = Math.max(2, Math.round((z1 - z0) / 1.0) + 1)
  return (
    <group name="DisplayShelf">
      <WoodSpan
        min={[Math.min(wx, wx + s * depth), y - 0.03, z0]}
        max={[Math.max(wx, wx + s * depth), y, z1]}
        tone="honey"
      />
      {/* front lip stops leaning sleeves sliding off */}
      <WoodSpan
        min={[Math.min(wx + s * (depth - 0.015), wx + s * depth), y, z0]}
        max={[Math.max(wx + s * (depth - 0.015), wx + s * depth), y + 0.025, z1]}
        tone="honey"
      />
      {Array.from({ length: brackets }, (_, i) => {
        const z = z0 + 0.08 + ((z1 - z0 - 0.16) * i) / (brackets - 1)
        return (
          <WoodSpan
            key={i}
            min={[Math.min(wx, wx + s * depth * 0.8), y - 0.16, z - 0.012]}
            max={[Math.max(wx, wx + s * depth * 0.8), y - 0.03, z + 0.012]}
            tone="black"
          />
        )
      })}
    </group>
  )
}
