import * as THREE from 'three'

/** Deterministic PRNG so every visit generates the same shop. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

export interface TexOptions {
  srgb?: boolean
  anisotropy?: number
  /** Surfaces use world-space UVs well beyond 0..1, so they must tile. */
  tile?: boolean
}

export function toTexture(c: HTMLCanvasElement, { srgb = true, anisotropy = 8, tile = false }: TexOptions = {}) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = anisotropy
  if (tile) t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.needsUpdate = true
  return t
}

const cache = new Map<string, unknown>()

/** Generate once, reuse everywhere. Shared textures mean shared GPU uploads. */
export function cached<T>(key: string, make: () => T): T {
  if (!cache.has(key)) cache.set(key, make())
  return cache.get(key) as T
}

export function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`
}

/** Speckle noise: many tiny semi-transparent dots. Cheap alternative to per-pixel noise. */
export function speckle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  r: () => number,
  colors: string[],
  size = 2,
) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(r() * colors.length) | 0]
    const s = size * (0.5 + r())
    ctx.fillRect(x + r() * w, y + r() * h, s, s)
  }
}

export const FONT_DISPLAY = '"Oswald", "Bebas Neue", Impact, "Arial Narrow", sans-serif'
export const FONT_SERIF = '"Playfair Display", Georgia, serif'
export const FONT_BODY = '"Inter", system-ui, sans-serif'

/** Fit a single line of text into maxWidth by shrinking the font size. */
export function fitText(ctx: CanvasRenderingContext2D, text: string, weight: string, family: string, size: number, maxWidth: number) {
  let s = size
  do {
    ctx.font = `${weight} ${s}px ${family}`
    if (ctx.measureText(text).width <= maxWidth) break
    s -= 2
  } while (s > 8)
  return s
}

/** Simple word wrap. Returns the lines. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}
