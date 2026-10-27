import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { interactions } from '../data/portfolio'
import { input } from '../controls/input'
import { getState, openPanel, setState } from '../state/store'
import { RAY_LAYER, findInteractId } from './Interactive'

const REACH = 3.4 // metres, first person
const HZ = 20

function isShown(o: THREE.Object3D | null) {
  for (; o; o = o.parent) if (!o.visible) return false
  return true
}

/** Run the action mapped to an interactId in the portfolio data. */
export function activate(id: string) {
  const it = interactions[id]
  if (!it) return
  if (it.target.kind === 'link') window.open(it.target.url, '_blank', 'noopener')
  else openPanel(it.target)
}

/**
 * Casts a ray from the centre of the view (first person) or from the mouse
 * pointer (overview) against the interaction layer, publishes the hovered id
 * and handles E / tap / click activation.
 */
export function Interactor() {
  const { camera, scene, gl, pointer } = useThree()
  const raycaster = useMemo(() => {
    const r = new THREE.Raycaster()
    r.layers.set(RAY_LAYER)
    return r
  }, [])
  const acc = useRef(0)
  const center = useMemo(() => new THREE.Vector2(0, 0), [])

  const pick = (ndc: THREE.Vector2, far: number) => {
    raycaster.far = far
    raycaster.setFromCamera(ndc, camera)
    // Culled walls stay in the scene but are hidden; they must not block the ray.
    const hit = raycaster.intersectObjects(scene.children, true).find((h) => isShown(h.object))
    return hit ? findInteractId(hit.object) : null
  }

  // overview mode: click objects directly with the mouse
  useEffect(() => {
    const el = gl.domElement
    let downAt: { x: number; y: number } | null = null
    const down = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY })
    const up = (e: PointerEvent) => {
      const s = getState()
      if (s.mode !== 'overview' || s.panel || !downAt) return
      // ignore drags (orbiting)
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return
      const rect = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      const id = pick(ndc, Infinity)
      if (id) activate(id)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointerup', up)
    }
  })

  useFrame((_, dt) => {
    const s = getState()
    if (s.panel || s.mode === 'welcome' || s.mode === 'loading') {
      input.usePressed = false
      input.tap = null
      if (s.hovered) setState({ hovered: null })
      return
    }

    // touch tap: pick at the tapped point
    if (input.tap) {
      const id = pick(new THREE.Vector2(input.tap.x, input.tap.y), REACH + 1)
      input.tap = null
      if (id) {
        activate(id)
        return
      }
    }

    acc.current += dt
    if (acc.current >= 1 / HZ) {
      acc.current = 0
      const overview = s.mode === 'overview'
      const id = overview ? pick(pointer, Infinity) : s.mode === 'explore' || s.isTouch ? pick(center, REACH) : null
      if (id !== s.hovered) setState({ hovered: id })
      gl.domElement.style.cursor = overview && id ? 'pointer' : ''
    }

    if (input.usePressed) {
      input.usePressed = false
      const h = getState().hovered
      if (h) activate(h)
    }
  })

  return null
}
