import { projects } from '../data/portfolio'
import { setState } from '../state/store'
import { coverAtlas, mainSignTexture, posterTexture, projectCover, vinylTexture } from './textures/artwork'
import { brick, contactShadow, floorPlanks, furnitureWood, plaster, wallBoards } from './textures/surfaces'

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/**
 * Generates every procedural texture ahead of mounting the scene, yielding to
 * the browser between steps so the loading indicator keeps animating.
 * Fonts are awaited first because sign and sleeve text is drawn into canvases.
 */
export async function prepareAssets() {
  const fonts = ['700 64px Oswald', '600 32px Oswald', '400 24px Inter', '500 24px Inter', 'italic 400 24px "Playfair Display"']
  try {
    await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))])
  } catch {
    /* fall back to system fonts */
  }
  const steps: (() => unknown)[] = [
    floorPlanks,
    wallBoards,
    brick,
    plaster,
    () => furnitureWood('honey'),
    () => furnitureWood('dark'),
    () => furnitureWood('pale'),
    () => furnitureWood('black'),
    coverAtlas,
    mainSignTexture,
    contactShadow,
    () => vinylTexture('#d9662b', 'turntable'),
    ...projects.map((p) => () => projectCover(p)),
    ...Array.from({ length: 26 }, (_, i) => () => posterTexture(i)),
  ]
  for (let i = 0; i < steps.length; i++) {
    steps[i]()
    setState({ loadProgress: ((i + 1) / steps.length) * 0.9 })
    if (i % 3 === 2) await frame()
  }
}
