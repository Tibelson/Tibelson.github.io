import { useLayoutEffect, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Merges the static meshes inside it into one mesh per material, cutting draw
 * calls (hundreds of shelf panels, trims and frames become a handful). The
 * components stay modular and individually editable in code; batching only
 * happens at runtime.
 *
 * Skipped: instanced meshes, multi-material meshes, transparent materials and
 * anything inside an `Interactive` group (those need their own identity).
 * Raycast layers are preserved on the merged result.
 */
export function StaticBatch({ name, children }: { name?: string; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || new URLSearchParams(location.search).has('nobatch')) return
    root.updateWorldMatrix(true, true)
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert()
    const buckets = new Map<string, { material: THREE.Material; meshes: THREE.Mesh[]; layers: number; cast: boolean; receive: boolean }>()

    const skip = (o: THREE.Object3D) => {
      for (let p: THREE.Object3D | null = o; p && p !== root; p = p.parent) if (p.userData?.interactId || p.userData?.noBatch) return true
      return false
    }

    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material)) return
      const mat = m.material as THREE.Material
      if (mat.transparent || !mat.visible || skip(m)) return
      const g = m.geometry
      const attrs = Object.keys(g.attributes).sort().join(',')
      const key = `${mat.uuid}|${attrs}|${g.index ? 'i' : 'n'}|${m.castShadow}|${m.receiveShadow}|${m.layers.mask}`
      let b = buckets.get(key)
      if (!b) buckets.set(key, (b = { material: mat, meshes: [], layers: m.layers.mask, cast: m.castShadow, receive: m.receiveShadow }))
      b.meshes.push(m)
    })

    const added: THREE.Mesh[] = []
    const removed: { mesh: THREE.Mesh; parent: THREE.Object3D }[] = []
    const tmp = new THREE.Matrix4()
    for (const b of buckets.values()) {
      if (b.meshes.length < 2) continue
      const geos = b.meshes.map((m) => {
        tmp.multiplyMatrices(inv, m.matrixWorld)
        return m.geometry.clone().applyMatrix4(tmp)
      })
      const merged = mergeGeometries(geos, false)
      geos.forEach((g) => g.dispose())
      if (!merged) continue
      const mesh = new THREE.Mesh(merged, b.material)
      mesh.name = `Batched_${b.material.name || 'mesh'}`
      mesh.castShadow = b.cast
      mesh.receiveShadow = b.receive
      mesh.layers.mask = b.layers
      root.add(mesh)
      added.push(mesh)
      for (const m of b.meshes) {
        if (m.parent) {
          removed.push({ mesh: m, parent: m.parent })
          m.parent.remove(m)
        }
      }
    }
    return () => {
      added.forEach((m) => {
        root.remove(m)
        m.geometry.dispose()
      })
      removed.forEach(({ mesh, parent }) => parent.add(mesh))
    }
  }, [])
  return (
    <group ref={ref} name={name}>
      {children}
    </group>
  )
}
