import * as THREE from 'three'
import { ATLAS_GRID, coverAtlas } from './textures/artwork'
import { brick, floorPlanks, furnitureWood, plaster, wallBoards } from './textures/surfaces'
import { cached } from './textures/util'

/**
 * Shared PBR materials. Every mesh of the same kind references the same
 * material instance so the renderer can batch state changes and the GPU holds
 * one copy of each texture.
 *
 * Texture repeats are expressed in world units: surface geometry produced by
 * `geometry.ts` carries UVs in metres divided by the texture's tile size.
 */

export type WoodTone = 'honey' | 'dark' | 'pale' | 'black'

/** Physical size (m) of one texture tile, used by geometry UV scaling. */
export const TILE = {
  floor: 2,
  boards: 2,
  brick: 1.5,
  plaster: 2,
  wood: 0.8,
}

export const floorMaterial = () =>
  cached('m-floor', () => {
    const t = floorPlanks()
    return new THREE.MeshStandardMaterial({
      name: 'Wood_Floor',
      map: t.map,
      bumpMap: t.bump,
      bumpScale: 1.5,
      roughnessMap: t.rough,
      roughness: 1,
      color: '#ffffff',
    })
  })

export const boardsMaterial = () =>
  cached('m-boards', () => {
    const t = wallBoards()
    return new THREE.MeshStandardMaterial({
      name: 'Wood_WallCladding',
      map: t.map,
      bumpMap: t.bump,
      bumpScale: 2,
      roughness: 0.88,
    })
  })

export const brickMaterial = () =>
  cached('m-brick', () => {
    const t = brick()
    return new THREE.MeshStandardMaterial({
      name: 'Brick_Exposed',
      map: t.map,
      bumpMap: t.bump,
      bumpScale: 2.5,
      roughness: 0.92,
    })
  })

export const plasterMaterial = () =>
  cached('m-plaster', () => new THREE.MeshStandardMaterial({ name: 'Plaster_Ceiling', map: plaster(), roughness: 0.95 }))

export const woodMaterial = (tone: WoodTone = 'honey', polished = false) =>
  cached(`m-wood-${tone}-${polished}`, () => {
    const t = furnitureWood(tone)
    return new THREE.MeshStandardMaterial({
      name: `Wood_${tone}${polished ? '_Polished' : ''}`,
      map: t.map,
      bumpMap: t.bump,
      bumpScale: 0.8,
      roughness: polished ? 0.5 : 0.8,
    })
  })

export const metalMaterial = (kind: 'brass' | 'steel' | 'black' | 'chrome' = 'steel') =>
  cached(`m-metal-${kind}`, () => {
    const p = {
      brass: { color: '#b08d57', roughness: 0.38, metalness: 1 },
      steel: { color: '#9aa0a6', roughness: 0.45, metalness: 1 },
      black: { color: '#1b1b1b', roughness: 0.55, metalness: 0.6 },
      chrome: { color: '#e6e6e6', roughness: 0.18, metalness: 1 },
    }[kind]
    return new THREE.MeshStandardMaterial({ name: `Metal_${kind}`, ...p })
  })

export const plainMaterial = (color: string, roughness = 0.8, name = 'Plain') =>
  cached(`m-plain-${color}-${roughness}`, () => new THREE.MeshStandardMaterial({ name: `${name}_${color}`, color, roughness }))

export const paperMaterial = (map: THREE.Texture, key: string) =>
  cached(`m-paper-${key}`, () => new THREE.MeshStandardMaterial({ name: `Paper_${key}`, map, roughness: 0.82 }))

/** Paper sleeve edge / back colour. */
export const sleeveEdgeMaterial = () =>
  cached('m-sleeve-edge', () => new THREE.MeshStandardMaterial({ name: 'Paper_SleeveEdge', color: '#d9cdb5', roughness: 0.9 }))

export const emissiveMaterial = (color: string, intensity: number, map?: THREE.Texture) =>
  cached(
    `m-emit-${color}-${intensity}-${map?.uuid ?? ''}`,
    () =>
      new THREE.MeshStandardMaterial({
        name: `Emissive_${color}`,
        color: map ? '#ffffff' : color,
        ...(map ? { map, emissiveMap: map } : {}),
        emissive: color,
        emissiveIntensity: intensity,
        roughness: 0.6,
      }),
  )

/**
 * Album sleeve material for instanced records. Each instance picks one cell of
 * the cover atlas through the per-instance `aCover` attribute, so thousands of
 * differently coloured sleeves render in one draw call per run.
 */
export const instancedSleeveMaterial = () =>
  cached('m-sleeve-instanced', () => {
    const m = new THREE.MeshStandardMaterial({ name: 'Paper_SleeveAtlas', map: coverAtlas(), roughness: 0.78 })
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aCover;')
        .replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>
#ifdef USE_MAP
  vec2 cell = vec2(mod(aCover, ${ATLAS_GRID}.0), ${ATLAS_GRID - 1}.0 - floor(aCover / ${ATLAS_GRID}.0));
  vMapUv = (clamp(vMapUv, 0.01, 0.99) + cell) / ${ATLAS_GRID}.0;
#endif`,
        )
    }
    m.customProgramCacheKey = () => 'sleeve-atlas'
    return m
  })
