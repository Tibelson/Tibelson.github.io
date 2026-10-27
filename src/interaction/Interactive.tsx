import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type * as THREE from 'three'
import type { ThreeElements } from '@react-three/fiber'

/**
 * Raycasting only considers objects on this layer. Interactive objects and
 * large occluders (walls, shelving carcasses) opt in, decorative clutter does
 * not, which keeps the per-frame ray cheap and stops prompts showing through
 * walls.
 */
export const RAY_LAYER = 1

type GroupProps = Omit<ThreeElements['group'], 'ref'>

function useLayer(ref: React.RefObject<THREE.Group | null>, apply: (o: THREE.Object3D) => void) {
  useLayoutEffect(() => {
    ref.current?.traverse(apply)
  })
}

/**
 * Wrap any meshes to make them interactive. `target` must be a key of
 * `interactions` in src/data/portfolio.ts.
 */
export function Interactive({ target: id, children, ...props }: Omit<GroupProps, 'id'> & { target: string; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useLayer(ref, (o) => o.layers.enable(RAY_LAYER))
  return (
    <group ref={ref} name={`Interactive:${id}`} userData={{ interactId: id }} {...props}>
      {children}
    </group>
  )
}

/** Blocks the interaction ray without being interactive itself. */
export function Occluder({ children, ...props }: GroupProps & { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useLayer(ref, (o) => o.layers.enable(RAY_LAYER))
  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  )
}

/** Walk up the parent chain to find the interactId of a hit object. */
export function findInteractId(o: THREE.Object3D | null): string | null {
  while (o) {
    if (o.userData?.interactId) return o.userData.interactId as string
    o = o.parent
  }
  return null
}
