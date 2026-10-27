import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { sleeveGeometry } from '../scene/geometry'

/**
 * Exports the generated shop as a binary glTF (GLB) for Blender or other
 * engines. Run by opening the site with `?export` (see scripts/export-glb.mjs).
 *
 * Notes on fidelity:
 * - Instanced records export through EXT_mesh_gpu_instancing. Their per-instance
 *   atlas cell is a custom shader feature, so in other tools every instanced
 *   sleeve shows the whole atlas; re-assign covers there if needed.
 * - Invisible hit areas and debug collision boxes are left out.
 */
export async function exportStoreGlb(scene: THREE.Scene, maxTextureSize = 1024): Promise<Blob> {
  const store = scene.getObjectByName('VinylStore')
  if (!store) throw new Error('VinylStore group not found')
  const copy = store.clone(true)
  const drop: THREE.Object3D[] = []
  copy.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (o.name === 'CollisionVolumes') drop.push(o)
    if (mesh.isMesh && !Array.isArray(mesh.material) && mesh.material && !mesh.material.visible) drop.push(o)
    if ((o as THREE.InstancedMesh).isInstancedMesh && mesh.geometry.getAttribute('aCover')) mesh.geometry = sleeveGeometry()
    o.visible = true
  })
  drop.forEach((o) => o.removeFromParent())
  const result = await new GLTFExporter().parseAsync(copy, { binary: true, maxTextureSize, onlyVisible: false })
  return new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' })
}

export function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
