import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { ROOM } from '../layout'
import { emissiveMaterial, metalMaterial, paperMaterial, plainMaterial, woodMaterial } from '../materials'
import { labelTexture, mainSignTexture, posterTexture } from '../textures/artwork'
import { cached } from '../textures/util'
import { VinylDisc, WoodBox } from './primitives'
import { useStore } from '../../state/store'

type GroupProps = Omit<ThreeElements['group'], 'ref'>
const WARM = '#ffb469'

const bulbMaterial = () =>
  cached(
    'm-bulb',
    () =>
      new THREE.MeshStandardMaterial({
        name: 'Glass_BulbEmissive',
        color: '#fff2d6',
        emissive: '#ffb25e',
        emissiveIntensity: 6,
        roughness: 0.2,
      }),
  )

const shadeGlass = () =>
  cached(
    'm-globe',
    () =>
      new THREE.MeshPhysicalMaterial({
        name: 'Glass_Globe',
        color: '#fff1dc',
        emissive: '#ffad5a',
        emissiveIntensity: 1.4,
        transparent: true,
        opacity: 0.55,
        roughness: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
  )

/**
 * Pendant lamp hanging from the ceiling. Origin = ceiling attachment point.
 * Lights: a soft point light everywhere, plus an optional shadow-casting spot
 * pointing down for the most important pools of light (high quality only).
 */
export function PendantLamp({
  drop,
  shade = 'none',
  intensity = 3.2,
  shadowSpot = false,
  ...props
}: GroupProps & { drop: number; shade?: 'none' | 'dome' | 'globe'; intensity?: number; shadowSpot?: boolean }) {
  const quality = useStore((s) => s.quality)
  const spotTarget = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0, -3, 0)
    return o
  }, [])
  return (
    <group name="PendantLight" {...props}>
      {/* ceiling rose */}
      <mesh position={[0, -0.012, 0]} material={metalMaterial('black')}>
        <cylinderGeometry args={[0.045, 0.05, 0.024, 20]} />
      </mesh>
      {/* cord */}
      <mesh position={[0, -drop / 2, 0]} material={plainMaterial('#141414', 0.7, 'Cord')}>
        <cylinderGeometry args={[0.0035, 0.0035, drop, 6]} />
      </mesh>
      {/* socket */}
      <mesh position={[0, -drop - 0.03, 0]} material={metalMaterial('brass')} castShadow>
        <cylinderGeometry args={[0.018, 0.02, 0.06, 16]} />
      </mesh>
      {/* bulb: elongated Edison style */}
      <mesh name="Bulb" position={[0, -drop - 0.11, 0]} scale={[1, 1.45, 1]} material={bulbMaterial()}>
        <sphereGeometry args={[0.045, 20, 16]} />
      </mesh>
      {shade === 'dome' && (
        <mesh position={[0, -drop - 0.09, 0]} material={metalMaterial('black')} castShadow>
          <cylinderGeometry args={[0.035, 0.19, 0.16, 32, 1, true]} />
        </mesh>
      )}
      {shade === 'globe' && (
        <mesh position={[0, -drop - 0.12, 0]} material={shadeGlass()}>
          <sphereGeometry args={[0.13, 28, 20]} />
        </mesh>
      )}
      <pointLight
        position={[0, -drop - 0.18, 0]}
        color={WARM}
        intensity={intensity * (quality === 'low' ? 1.25 : 1)}
        distance={7}
        decay={1.6}
      />
      {shadowSpot && quality === 'high' && (
        <>
          <primitive object={spotTarget} />
          <spotLight
            position={[0, -drop - 0.15, 0]}
            target={spotTarget}
            color={WARM}
            intensity={intensity * 2.2}
            angle={1.15}
            penumbra={1}
            distance={6}
            decay={1.6}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0004}
            shadow-normalBias={0.02}
          />
        </>
      )}
    </group>
  )
}

/** Table lamp with a fabric shade. Origin = base on the table surface. */
export function TableLamp({ shadeColor = '#efd9b0', ...props }: GroupProps & { shadeColor?: string }) {
  const quality = useStore((s) => s.quality)
  const shadeMat = useMemo(
    () =>
      cached(
        `m-lampshade-${shadeColor}`,
        () =>
          new THREE.MeshStandardMaterial({
            name: 'Fabric_Lampshade',
            color: shadeColor,
            emissive: '#ffb468',
            emissiveIntensity: 0.9,
            roughness: 0.95,
            side: THREE.DoubleSide,
          }),
      ),
    [shadeColor],
  )
  return (
    <group name="TableLamp" {...props}>
      <mesh position={[0, 0.015, 0]} material={metalMaterial('brass')} castShadow>
        <cylinderGeometry args={[0.07, 0.08, 0.03, 24]} />
      </mesh>
      <mesh position={[0, 0.18, 0]} material={metalMaterial('brass')} castShadow>
        <cylinderGeometry args={[0.009, 0.009, 0.32, 8]} />
      </mesh>
      <mesh position={[0, 0.39, 0]} material={shadeMat} castShadow>
        <cylinderGeometry args={[0.08, 0.15, 0.17, 32, 1, true]} />
      </mesh>
      <mesh position={[0, 0.34, 0]} material={bulbMaterial()}>
        <sphereGeometry args={[0.025, 12, 10]} />
      </mesh>
      {/* small local lights are a high-quality luxury; the emissive shade still glows in low */}
      {quality === 'high' && <pointLight position={[0, 0.33, 0]} color={WARM} intensity={0.6} distance={2.5} decay={1.8} />}
    </group>
  )
}

const placeKeys = (keys: [number, number, number][], dy: number) => (m: THREE.InstancedMesh | null) => {
  if (!m) return
  const t = new THREE.Matrix4()
  keys.forEach(([x, y, z], i) => m.setMatrixAt(i, t.makeTranslation(x, y + dy, z)))
  m.instanceMatrix.needsUpdate = true
  m.computeBoundingSphere()
}

/** Vintage brass cash register. Origin = centre of the base, front faces +Z. */
export function CashRegister(props: GroupProps) {
  const body = useMemo(() => {
    // side profile: tall at the back, sloping key bed towards the front
    const s = new THREE.Shape()
    s.moveTo(-0.2, 0)
    s.lineTo(0.2, 0)
    s.lineTo(0.2, 0.12)
    s.lineTo(-0.04, 0.26)
    s.lineTo(-0.2, 0.3)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.38, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 })
    g.translate(0, 0, -0.19)
    g.rotateY(-Math.PI / 2)
    return g
  }, [])
  const keys = useMemo(() => {
    const out: [number, number, number][] = []
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 8; col++) {
        const z = 0.15 - row * 0.05
        const y = 0.13 + row * 0.03
        out.push([-0.15 + col * 0.043, y + 0.015, z])
      }
    return out
  }, [])
  const keyCap = plainMaterial('#efe7d6', 0.4, 'KeyCap')
  return (
    <group name="CashRegister" {...props}>
      <mesh geometry={body} material={metalMaterial('brass')} castShadow receiveShadow />
      {/* drawer */}
      <mesh position={[0, -0.04, 0]} material={woodMaterial('dark', true)} castShadow>
        <boxGeometry args={[0.42, 0.08, 0.44]} />
      </mesh>
      <mesh position={[0, -0.04, 0.222]} material={metalMaterial('brass')}>
        <boxGeometry args={[0.08, 0.02, 0.01]} />
      </mesh>
      {/* 32 keys = two instanced draws (stems + caps) */}
      <instancedMesh ref={placeKeys(keys, 0)} args={[undefined, metalMaterial('steel'), keys.length]}>
        <cylinderGeometry args={[0.003, 0.003, 0.03, 6]} />
      </instancedMesh>
      <instancedMesh ref={placeKeys(keys, 0.018)} args={[undefined, keyCap, keys.length]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.008, 14]} />
      </instancedMesh>
      {/* top display with price flags */}
      <mesh position={[0, 0.36, -0.12]} material={metalMaterial('brass')} castShadow>
        <boxGeometry args={[0.3, 0.12, 0.08]} />
      </mesh>
      <mesh position={[0, 0.365, -0.079]} material={emissiveMaterial('#f6e7c6', 0.25, labelTexture('register', ['$ 12.50'], { w: 256, h: 96, bg: '#f4ead0', fg: '#2a1d10', border: false }))}>
        <planeGeometry args={[0.24, 0.07]} />
      </mesh>
      {/* crank */}
      <group position={[0.215, 0.12, 0.02]}>
        <mesh rotation-z={Math.PI / 2} material={metalMaterial('chrome')}>
          <cylinderGeometry args={[0.012, 0.012, 0.04, 10]} />
        </mesh>
        <mesh position={[0.03, -0.05, 0]} material={metalMaterial('chrome')}>
          <cylinderGeometry args={[0.006, 0.006, 0.12, 8]} />
        </mesh>
        <mesh position={[0.03, -0.11, 0]} material={woodMaterial('black', true)}>
          <sphereGeometry args={[0.016, 12, 10]} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Turntable with spinning platter. Origin = centre of the plinth base, front +Z
 * by default (rotate the group to place it).
 */
export function Turntable(props: GroupProps) {
  const platter = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (platter.current) platter.current.rotation.y -= dt * ((33.333 / 60) * Math.PI * 2)
  })
  return (
    <group name="Turntable" {...props}>
      <WoodBox size={[0.46, 0.09, 0.36]} position={[0, 0.045, 0]} tone="dark" polished />
      <mesh position={[0, 0.0915, 0]} material={metalMaterial('steel')} receiveShadow>
        <boxGeometry args={[0.44, 0.003, 0.34]} />
      </mesh>
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, -0.005, x > 0 ? 0.14 : -0.14]} material={plainMaterial('#111', 0.6, 'Rubber')}>
          <cylinderGeometry args={[0.02, 0.022, 0.01, 12]} />
        </mesh>
      ))}
      <group ref={platter} position={[-0.05, 0.096, 0]}>
        <mesh material={metalMaterial('chrome')} castShadow>
          <cylinderGeometry args={[0.152, 0.152, 0.012, 64]} />
        </mesh>
        <mesh position={[0, 0.008, 0]} material={plainMaterial('#151515', 0.95, 'Slipmat')}>
          <cylinderGeometry args={[0.149, 0.149, 0.003, 64]} />
        </mesh>
        <VinylDisc position={[0, 0.0095, 0]} labelColor="#d9662b" labelKey="turntable" />
        <mesh position={[0, 0.02, 0]} material={metalMaterial('chrome')}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.025, 8]} />
        </mesh>
      </group>
      {/* tonearm */}
      <group position={[0.16, 0.1, -0.11]}>
        <mesh material={metalMaterial('chrome')} castShadow>
          <cylinderGeometry args={[0.022, 0.026, 0.03, 20]} />
        </mesh>
        <group position={[0, 0.028, 0]} rotation-y={0.5}>
          <mesh position={[0, 0, 0.11]} rotation-x={Math.PI / 2} material={metalMaterial('chrome')} castShadow>
            <cylinderGeometry args={[0.0045, 0.0045, 0.23, 8]} />
          </mesh>
          <mesh position={[0, -0.008, 0.235]} material={metalMaterial('black')}>
            <boxGeometry args={[0.018, 0.012, 0.035]} />
          </mesh>
          <mesh position={[0, 0, -0.04]} rotation-x={Math.PI / 2} material={metalMaterial('steel')}>
            <cylinderGeometry args={[0.016, 0.016, 0.03, 16]} />
          </mesh>
        </group>
      </group>
      {[0.12, 0.17].map((x) => (
        <mesh key={x} position={[x, 0.1, 0.13]} material={metalMaterial('chrome')}>
          <cylinderGeometry args={[0.012, 0.012, 0.012, 16]} />
        </mesh>
      ))}
      <mesh position={[-0.19, 0.096, 0.14]} material={emissiveMaterial('#ff4d2e', 3)}>
        <sphereGeometry args={[0.004, 8, 6]} />
      </mesh>
    </group>
  )
}

/** Framed (or taped) poster. Origin = centre, front faces +Z. Size in metres. */
export function Poster({
  index,
  texture,
  textureKey,
  size = [0.5, 0.75],
  frame = 'black',
  ...props
}: GroupProps & {
  index?: number
  texture?: THREE.Texture
  textureKey?: string
  size?: [number, number]
  frame?: 'black' | 'wood' | 'none'
}) {
  const [w, h] = size
  const mat = useMemo(() => paperMaterial(texture ?? posterTexture(index ?? 0), textureKey ?? `poster-${index}`), [texture, index, textureKey])
  const frameMat = frame === 'wood' ? woodMaterial('dark', true) : metalMaterial('black')
  const b = 0.025
  return (
    <group name="Poster" {...props}>
      {frame !== 'none' && (
        <>
          <mesh position={[0, 0, -0.008]} material={frameMat} castShadow>
            <boxGeometry args={[w + b * 2, h + b * 2, 0.02]} />
          </mesh>
        </>
      )}
      <mesh position={[0, 0, frame === 'none' ? 0.001 : 0.0025]} material={mat} receiveShadow>
        <planeGeometry args={[w, h]} />
      </mesh>
      {frame === 'none' &&
        [
          [-1, 1],
          [1, 1],
          [-1, -1],
          [1, -1],
        ].map(([sx, sy], i) => (
          <mesh
            key={i}
            position={[(sx * w) / 2 - sx * 0.01, (sy * h) / 2 - sy * 0.01, 0.002]}
            rotation-z={sx * sy * 0.7}
            material={plainMaterial('#e8dfc8', 0.6, 'Tape')}
          >
            <planeGeometry args={[0.06, 0.022]} />
          </mesh>
        ))}
    </group>
  )
}

/** Illuminated lightbox sign: "VINYL ECSTATIC". Origin = centre, front +Z. */
export function MainSign(props: GroupProps) {
  const quality = useStore((s) => s.quality)
  const face = useMemo(() => emissiveMaterial('#ffe2b8', 1.35, mainSignTexture()), [])
  return (
    <group name="MainSign" {...props}>
      <mesh material={metalMaterial('black')} castShadow>
        <boxGeometry args={[1.42, 0.5, 0.12]} />
      </mesh>
      <mesh position={[0, 0, 0.061]} material={face}>
        <planeGeometry args={[1.32, 0.4]} />
      </mesh>
      {/* thin brass trim */}
      {[
        [0, 0.235, 1.42, 0.012],
        [0, -0.235, 1.42, 0.012],
        [0.705, 0, 0.012, 0.48],
        [-0.705, 0, 0.012, 0.48],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.062]} material={metalMaterial('brass')}>
          <boxGeometry args={[w, h, 0.006]} />
        </mesh>
      ))}
      {/* hanging chains */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 0.25 + (ROOM.height - 2.72) / 2, 0]} material={metalMaterial('steel')}>
          <cylinderGeometry args={[0.003, 0.003, ROOM.height - 2.72, 6]} />
        </mesh>
      ))}
      {quality === 'high' && <pointLight position={[0, -0.1, 0.45]} color="#ffc98a" intensity={1.6} distance={3.5} decay={1.6} />}
    </group>
  )
}

/** Small free-standing card sign (e.g. "SUPPORT INDIE MUSIC"). Origin = bottom centre. */
export function StandSign({ lines, w = 0.32, h = 0.2, bg = '#f3ead8', fg = '#1a1714', ...props }: GroupProps & { lines: string[]; w?: number; h?: number; bg?: string; fg?: string }) {
  const tex = labelTexture(lines.join('|'), lines, { w: 512, h: Math.round((512 * h) / w), bg, fg })
  const mat = paperMaterial(tex, `stand-${lines.join('|')}`)
  return (
    <group name="StandSign" {...props}>
      <mesh position={[0, h / 2 + 0.02, 0]} rotation-x={-0.12} castShadow material={[woodMaterial('dark'), woodMaterial('dark'), woodMaterial('dark'), woodMaterial('dark'), mat, woodMaterial('dark')]}>
        <boxGeometry args={[w, h, 0.012]} />
      </mesh>
      <mesh position={[0, 0.01, -0.02]} material={woodMaterial('dark')} castShadow>
        <boxGeometry args={[w * 0.9, 0.02, 0.08]} />
      </mesh>
    </group>
  )
}

const plainLine = () => cached('m-wire', () => new THREE.LineBasicMaterial({ name: 'Wire', color: '#2a2016' }))

/** Fairy lights strung along a sagging line between two points. */
export function FairyLights({ from, to, count = 40, sag = 0.12 }: { from: [number, number, number]; to: [number, number, number]; count?: number; sag?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const pts = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1)
      const p = a.clone().lerp(b, t)
      p.y -= Math.sin(t * Math.PI * 3) ** 2 * sag
      return p
    })
  }, [from, to, count, sag])
  const wire = useMemo(
    () => new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), plainLine()),
    [pts],
  )
  const onMount = (m: THREE.InstancedMesh | null) => {
    if (!m) return
    const mat = new THREE.Matrix4()
    pts.forEach((p, i) => m.setMatrixAt(i, mat.makeTranslation(p.x, p.y - 0.01, p.z)))
    m.instanceMatrix.needsUpdate = true
    ref.current = m
  }
  return (
    <group name="FairyLights">
      <primitive object={wire} />
      <instancedMesh ref={onMount} args={[undefined, undefined, count]} material={emissiveMaterial('#ffbf73', 5)}>
        <sphereGeometry args={[0.008, 8, 6]} />
      </instancedMesh>
    </group>
  )
}

/** Bookshelf speaker. Origin = bottom centre, front +Z. */
export function Speaker(props: GroupProps) {
  return (
    <group name="Speaker" {...props}>
      <WoodBox size={[0.22, 0.34, 0.24]} position={[0, 0.17, 0]} tone="dark" />
      <mesh position={[0, 0.17, 0.121]} material={plainMaterial('#1b1916', 0.95, 'Grille')}>
        <planeGeometry args={[0.2, 0.32]} />
      </mesh>
      <mesh position={[0, 0.13, 0.123]} rotation-x={Math.PI / 2} material={metalMaterial('black')}>
        <cylinderGeometry args={[0.07, 0.07, 0.004, 24]} />
      </mesh>
      <mesh position={[0, 0.26, 0.123]} rotation-x={Math.PI / 2} material={metalMaterial('black')}>
        <cylinderGeometry args={[0.025, 0.025, 0.004, 16]} />
      </mesh>
    </group>
  )
}

/** Computer monitor with a dim screen. Origin = bottom centre, screen faces +Z. */
export function Monitor(props: GroupProps) {
  return (
    <group name="Monitor" {...props}>
      <mesh position={[0, 0.01, 0]} material={metalMaterial('black')} castShadow>
        <boxGeometry args={[0.18, 0.02, 0.14]} />
      </mesh>
      <mesh position={[0, 0.12, -0.02]} material={metalMaterial('black')}>
        <boxGeometry args={[0.04, 0.2, 0.02]} />
      </mesh>
      <mesh position={[0, 0.26, 0]} material={metalMaterial('black')} castShadow>
        <boxGeometry args={[0.42, 0.27, 0.03]} />
      </mesh>
      <mesh position={[0, 0.26, 0.0155]} material={emissiveMaterial('#1d2b3a', 0.6)}>
        <planeGeometry args={[0.39, 0.24]} />
      </mesh>
    </group>
  )
}
