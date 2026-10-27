import type * as THREE from 'three'
import { cached, canvas, hsl, rng, speckle, toTexture } from './util'

/**
 * Procedural PBR-ish surface maps. Each generator returns a colour map plus a
 * greyscale map used as both bump and roughness input. Canvases are sized for
 * a known physical extent so world-space repeats stay consistent.
 */

export interface SurfaceMaps {
  map: THREE.Texture
  bump: THREE.Texture
  rough: THREE.Texture
}


function grain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: () => number,
  vertical: boolean,
  density = 0.7,
  dark = 'rgba(40,20,8,',
  light = 'rgba(255,220,170,',
) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  const across = vertical ? w : h
  const along = vertical ? h : w
  const n = Math.max(6, across * density)
  for (let i = 0; i < n; i++) {
    const off = r() * across
    const amp = 0.5 + r() * 3
    const freq = 0.004 + r() * 0.02
    const ph = r() * 10
    const a = 0.04 + r() * 0.16
    ctx.strokeStyle = (r() < 0.75 ? dark : light) + a + ')'
    ctx.lineWidth = 0.4 + r() * 1.6
    ctx.beginPath()
    for (let s = 0; s <= along; s += 6) {
      const d = off + Math.sin(s * freq + ph) * amp + Math.sin(s * freq * 3.1 + ph) * amp * 0.3
      if (vertical) ctx.lineTo(x + d, y + s)
      else ctx.lineTo(x + s, y + d)
    }
    ctx.stroke()
  }
  // occasional knot
  if (r() < 0.35) {
    const kx = x + r() * w
    const ky = y + r() * h
    for (let k = 6; k > 0; k--) {
      ctx.strokeStyle = `${dark}${0.12 + 0.05 * (6 - k)})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(kx, ky, k * (vertical ? 1.6 : 4), k * (vertical ? 4 : 1.6), 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/** Old honey-brown floorboards. Tile = 2 m x 2 m, planks run along Z. */
export const floorPlanks = () =>
  cached('floor', (): SurfaceMaps => {
    const S = 1024
    const { c, ctx } = canvas(S, S)
    const { c: b, ctx: bx } = canvas(S, S)
    const { c: ro, ctx: rx } = canvas(S, S)
    const r = rng(11)
    const plankW = S / 14
    bx.fillStyle = '#000'
    bx.fillRect(0, 0, S, S)
    rx.fillStyle = 'rgb(205,205,205)'
    rx.fillRect(0, 0, S, S)
    for (let i = 0; i < 14; i++) {
      const x = i * plankW
      let y = -r() * S * 0.6
      while (y < S) {
        const len = S * (0.4 + r() * 0.45)
        const hue = 26 + r() * 8
        const light = 20 + r() * 18
        const sat = 45 + r() * 15
        // draw twice when wrapping so the tile stays seamless vertically
        for (const yy of [y, y - S, y + S]) {
          ctx.fillStyle = hsl(hue, sat, light)
          ctx.fillRect(x, yy, plankW, len)
          const g = ctx.createLinearGradient(x, 0, x + plankW, 0)
          g.addColorStop(0, 'rgba(0,0,0,0.25)')
          g.addColorStop(0.15, 'rgba(0,0,0,0)')
          g.addColorStop(0.85, 'rgba(0,0,0,0)')
          g.addColorStop(1, 'rgba(0,0,0,0.3)')
          ctx.fillStyle = g
          ctx.fillRect(x, yy, plankW, len)
          grain(ctx, x, yy, plankW, len, rng((i + 1) * 977 + Math.floor(y)), true, 0.6)
          bx.fillStyle = `rgb(${150 + r() * 40},${150 + r() * 40},${150 + r() * 40})`
          bx.fillRect(x + 2, yy + 2, plankW - 4, len - 4)
          // worn, slightly polished middle of plank
          rx.fillStyle = `rgba(150,150,150,${0.2 + r() * 0.3})`
          rx.fillRect(x + plankW * 0.25, yy + len * 0.1, plankW * 0.5, len * 0.8)
          // gaps
          ctx.fillStyle = 'rgba(15,8,3,0.9)'
          ctx.fillRect(x, yy, 3, len)
          ctx.fillRect(x, yy + len - 3, plankW, 3)
          // nails
          ctx.fillStyle = 'rgba(20,14,10,0.8)'
          for (const ny of [yy + 10, yy + len - 14]) {
            ctx.fillRect(x + plankW * 0.2, ny, 3, 3)
            ctx.fillRect(x + plankW * 0.78, ny, 3, 3)
          }
        }
        y += len
      }
    }
    // grime and scuffs
    for (let i = 0; i < 40; i++) {
      const g = ctx.createRadialGradient(r() * S, r() * S, 0, r() * S, r() * S, 40 + r() * 160)
      g.addColorStop(0, `rgba(${r() < 0.5 ? '20,10,5' : '255,200,140'},${0.04 + r() * 0.06})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
    }
    speckle(ctx, 0, 0, S, S, 6000, r, ['rgba(0,0,0,0.15)', 'rgba(255,230,190,0.07)'], 1.5)
    return { map: toTexture(c, { tile: true }), bump: toTexture(b, { srgb: false, tile: true }), rough: toTexture(ro, { srgb: false, tile: true }) }
  })

/** Weathered horizontal cladding for rear/right walls. Tile = 2 m x 2 m. */
export const wallBoards = () =>
  cached('wallBoards', (): SurfaceMaps => {
    const S = 1024
    const { c, ctx } = canvas(S, S)
    const { c: b, ctx: bx } = canvas(S, S)
    const r = rng(23)
    const rows = 12
    const bh = S / rows
    bx.fillStyle = '#000'
    bx.fillRect(0, 0, S, S)
    for (let i = 0; i < rows; i++) {
      const y = i * bh
      let x = -r() * S * 0.5
      while (x < S) {
        const len = S * (0.35 + r() * 0.6)
        const hue = 25 + r() * 12
        const sat = 22 + r() * 25
        const light = 22 + r() * 18
        for (const xx of [x, x - S, x + S]) {
          ctx.fillStyle = hsl(hue, sat, light)
          ctx.fillRect(xx, y, len, bh)
          grain(ctx, xx, y, len, bh, rng(i * 131 + Math.floor(x) + 7), false, 0.5)
          // weathering: pale washed-out streaks
          ctx.fillStyle = `rgba(200,180,150,${r() * 0.12})`
          ctx.fillRect(xx, y + r() * bh * 0.5, len, bh * 0.3)
          const g = ctx.createLinearGradient(0, y, 0, y + bh)
          g.addColorStop(0, 'rgba(255,230,190,0.08)')
          g.addColorStop(0.5, 'rgba(0,0,0,0)')
          g.addColorStop(1, 'rgba(0,0,0,0.35)')
          ctx.fillStyle = g
          ctx.fillRect(xx, y, len, bh)
          bx.fillStyle = `rgb(${160 + r() * 50},${160 + r() * 50},${160 + r() * 50})`
          bx.fillRect(xx + 2, y + 3, len - 4, bh - 6)
          ctx.fillStyle = 'rgba(10,6,3,0.85)'
          ctx.fillRect(xx, y, len, 3)
          ctx.fillRect(xx + len - 2, y, 2, bh)
          ctx.fillStyle = 'rgba(30,25,22,0.9)'
          ctx.fillRect(xx + 12, y + bh / 2 - 2, 4, 4)
          ctx.fillRect(xx + len - 18, y + bh / 2 - 2, 4, 4)
        }
        x += len
      }
    }
    speckle(ctx, 0, 0, S, S, 5000, r, ['rgba(0,0,0,0.18)', 'rgba(255,240,220,0.06)'], 1.5)
    const bump = toTexture(b, { srgb: false, tile: true })
    return { map: toTexture(c, { tile: true }), bump, rough: bump }
  })

/** Reddish-brown exposed brick. Tile = 1.5 m x 1.5 m. */
export const brick = () =>
  cached('brick', (): SurfaceMaps => {
    const S = 1024
    const { c, ctx } = canvas(S, S)
    const { c: b, ctx: bx } = canvas(S, S)
    const r = rng(5)
    const px = S / 1.5 // pixels per metre
    const bw = 0.215 * px
    const bh = 0.065 * px
    const m = 0.011 * px
    ctx.fillStyle = '#3a302a' // mortar
    ctx.fillRect(0, 0, S, S)
    speckle(ctx, 0, 0, S, S, 9000, r, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.2)'], 2)
    bx.fillStyle = '#000'
    bx.fillRect(0, 0, S, S)
    const rows = Math.round(S / (bh + m))
    const rowH = S / rows
    const cols = Math.round(S / (bw + m))
    const colW = S / cols
    for (let j = 0; j < rows; j++) {
      const off = j % 2 ? colW / 2 : 0
      for (let i = -1; i < cols + 1; i++) {
        const x = i * colW + off + m / 2
        const y = j * rowH + m / 2
        const w = colW - m
        const h = rowH - m
        const hue = 8 + r() * 14
        const sat = 35 + r() * 25
        const light = 22 + r() * 16 - (r() < 0.08 ? 10 : 0)
        ctx.fillStyle = hsl(hue, sat, light)
        ctx.beginPath()
        ctx.roundRect(x, y, w, h, 3)
        ctx.fill()
        // face variation
        const g = ctx.createLinearGradient(x, y, x + w, y + h)
        g.addColorStop(0, `rgba(255,190,150,${r() * 0.12})`)
        g.addColorStop(1, `rgba(0,0,0,${0.1 + r() * 0.2})`)
        ctx.fillStyle = g
        ctx.fillRect(x, y, w, h)
        speckle(ctx, x, y, w, h, 40, r, ['rgba(0,0,0,0.25)', 'rgba(255,210,170,0.12)', 'rgba(60,20,10,0.3)'], 2.5)
        // chipped corner
        if (r() < 0.15) {
          ctx.fillStyle = '#3a302a'
          ctx.beginPath()
          ctx.arc(x + (r() < 0.5 ? 0 : w), y + (r() < 0.5 ? 0 : h), 3 + r() * 5, 0, Math.PI * 2)
          ctx.fill()
        }
        bx.fillStyle = `rgb(${180 + r() * 50},${180 + r() * 50},${180 + r() * 50})`
        bx.beginPath()
        bx.roundRect(x + 1, y + 1, w - 2, h - 2, 4)
        bx.fill()
        speckle(bx, x, y, w, h, 12, r, ['rgba(0,0,0,0.25)'], 2.5)
      }
    }
    // soot / age gradient towards the ceiling
    const g = ctx.createLinearGradient(0, 0, 0, S)
    g.addColorStop(0, 'rgba(10,5,0,0.1)')
    g.addColorStop(1, 'rgba(10,5,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    const bump = toTexture(b, { srgb: false, tile: true })
    return { map: toTexture(c, { tile: true }), bump, rough: bump }
  })

/** Slightly aged off-white ceiling. Tile = 2 m. */
export const plaster = () =>
  cached('plaster', () => {
    const S = 512
    const { c, ctx } = canvas(S, S)
    const r = rng(3)
    ctx.fillStyle = '#d8d0c2'
    ctx.fillRect(0, 0, S, S)
    for (let i = 0; i < 30; i++) {
      const x = r() * S
      const y = r() * S
      const g = ctx.createRadialGradient(x, y, 0, x, y, 30 + r() * 120)
      g.addColorStop(0, `rgba(${r() < 0.6 ? '150,130,100' : '255,250,240'},${0.05 + r() * 0.08})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
    }
    speckle(ctx, 0, 0, S, S, 4000, r, ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.08)'], 1.5)
    return toTexture(c, { tile: true })
  })

/** Furniture wood. Grain runs along V. `tone` picks honey, dark-stained or pale. */
export const furnitureWood = (tone: 'honey' | 'dark' | 'pale' | 'black' = 'honey') =>
  cached(`wood-${tone}`, (): SurfaceMaps => {
    const S = 512
    const { c, ctx } = canvas(S, S)
    const { c: b, ctx: bx } = canvas(S, S)
    const r = rng(tone.length * 97 + 1)
    const base = {
      honey: [30, 50, 34],
      dark: [22, 40, 18],
      pale: [32, 32, 52],
      black: [20, 10, 9],
    }[tone]
    ctx.fillStyle = hsl(base[0], base[1], base[2])
    ctx.fillRect(0, 0, S, S)
    // a few boards with slightly different tone
    const boards = 4
    for (let i = 0; i < boards; i++) {
      ctx.fillStyle = hsl(base[0] + r() * 6 - 3, base[1], base[2] + r() * 8 - 4, 0.8)
      ctx.fillRect((i * S) / boards, 0, S / boards, S)
    }
    grain(ctx, 0, 0, S, S, r, true, 0.5, tone === 'black' ? 'rgba(0,0,0,' : 'rgba(40,20,8,', 'rgba(255,220,170,')
    if (tone === 'black') {
      // painted wood worn through to brown in places
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = `rgba(120,80,50,${r() * 0.15})`
        ctx.fillRect(r() * S, r() * S, 2 + r() * 20, 1 + r() * 4)
      }
    }
    speckle(ctx, 0, 0, S, S, 2500, r, ['rgba(0,0,0,0.12)', 'rgba(255,235,200,0.06)'], 1.5)
    bx.fillStyle = '#999'
    bx.fillRect(0, 0, S, S)
    grain(bx, 0, 0, S, S, rng(9), true, 0.4, 'rgba(0,0,0,', 'rgba(255,255,255,')
    const bump = toTexture(b, { srgb: false, tile: true })
    return { map: toTexture(c, { tile: true }), bump, rough: bump }
  })

/** Soft dark blob used as a cheap contact shadow under furniture. */
export const contactShadow = () =>
  cached('contactShadow', () => {
    const S = 128
    const { c, ctx } = canvas(S, S)
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(0.55, 'rgba(0,0,0,0.6)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    return toTexture(c, { srgb: false })
  })
