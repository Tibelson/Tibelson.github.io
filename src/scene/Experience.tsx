import { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { FirstPersonControls } from '../controls/FirstPersonControls'
import { Interactor } from '../interaction/Interactor'
import { getState, setState, useStore } from '../state/store'
import { Store } from './Store'
import { HALF_L, PLAYER } from './layout'

function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <N8AO aoRadius={0.45} intensity={2.2} distanceFalloff={0.6} quality="medium" halfRes />
      <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.55} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.3} darkness={0.45} />
    </EffectComposer>
  )
}

/** Orbit "dollhouse" view. Near walls cull themselves (see CulledWall). */
function Overview() {
  const { camera } = useThree()
  useEffect(() => {
    // Leaving overview needs no restore: the first-person controls stay
    // mounted and rewrite the camera pose from their own state every frame.
    camera.position.set(4.2, 5.2, HALF_L + 4.5)
  }, [camera])
  return <OrbitControls target={[0, 0.9, -0.5]} maxPolarAngle={Math.PI / 2.05} minDistance={2} maxDistance={16} enableDamping makeDefault />
}

/** Applies quality changes that Canvas props only honour at creation time. */
function RendererSettings({ high }: { high: boolean }) {
  const { gl, scene } = useThree()
  useEffect(() => {
    gl.toneMapping = high ? THREE.NoToneMapping : THREE.AgXToneMapping
    gl.shadowMap.enabled = high
    gl.shadowMap.type = THREE.PCFSoftShadowMap
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material
      if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => (mm.needsUpdate = true))
    })
  }, [gl, scene, high])
  return null
}

/** Tells the UI when the first frame has rendered; with ?export, also downloads the scene as GLB. */
function ReadySignal() {
  const done = useRef(false)
  const scene = useThree((s) => s.scene)
  useFrame(() => {
    if (done.current) return
    done.current = true
    if (getState().mode === 'loading') setState({ mode: 'welcome', loadProgress: 1 })
    if (new URLSearchParams(location.search).has('export'))
      import('../tools/exportGlb').then(async (m) => m.download(await m.exportStoreGlb(scene), 'vinyl-store.glb'))
  })
  return null
}

export default function Experience() {
  const quality = useStore((s) => s.quality)
  const mode = useStore((s) => s.mode)
  const high = quality === 'high'
  return (
    <Canvas
      className="scene-canvas"
      shadows="soft"
      dpr={high ? [1, 2] : [0.75, 1.25]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 70, near: 0.05, far: 40, position: [PLAYER.spawn.x, PLAYER.eyeHeight, PLAYER.spawn.z] }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.05
      }}
      aria-label="3D record store. Use the Sections menu for a keyboard-accessible alternative."
    >
      <color attach="background" args={['#0d0907']} />
      <fog attach="fog" args={['#120c08', 9, 22]} />
      <RendererSettings high={high} />
      {/* one-way, non-persisted downgrade if high quality can't hold ~28 fps */}
      <PerformanceMonitor bounds={() => [28, 1000]} flipflops={1} onDecline={() => getState().quality === 'high' && setState({ quality: 'low' })} />
      <Suspense fallback={null}>
        <Store />
        <ReadySignal />
      </Suspense>
      <FirstPersonControls />
      {mode === 'overview' && <Overview />}
      <Interactor />
      {high && <Effects />}
    </Canvas>
  )
}
