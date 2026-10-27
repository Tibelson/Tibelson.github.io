import type { CoverStyle, Project } from '../../data/portfolio'
import { FONT_BODY, FONT_DISPLAY, FONT_SERIF, cached, canvas, fitText, hash, hsl, rng, speckle, toTexture, wrap } from './util'

/**
 * Fictional album artwork, gig posters and shop signage, all drawn at runtime.
 * No copyrighted artwork is reproduced: band names below are invented.
 */

export const FICTIONAL_BANDS = [
  ['Static Orchard', 'Paper Lungs'],
  ['The Velvet Hours', 'Low Tide Choir'],
  ['Moth Parade', 'Cassette Heart'],
  ['Saint Fuzz', 'Basement Gospel'],
  ['Neon Widows', 'Glass Jaw'],
  ['Quiet Riot Girls', 'Slow Burn'],
  ['Halfway Ghosts', 'Night Swim'],
  ['Copper Kids', 'Feedback Loop'],
  ['The Lint Collectors', 'Dust Jacket'],
  ['Hollow Planets', 'Orbit Songs'],
  ['Dead Air Society', 'Signal Lost'],
  ['Wax Tadpoles', 'Pond Life'],
  ['Mild Peril', 'Sunday Panic'],
  ['The Grey Daisies', 'Pale Fire'],
  ['Thunder Bakery', 'Crumbs'],
  ['Joy Engine', 'Unknown Pressures'],
] as const

const PALETTES: [string, string, string][] = [
  ['#e8dcc4', '#1f1f1f', '#c0392b'],
  ['#1b1b2f', '#e43f5a', '#f9d342'],
  ['#2d3a3a', '#e0c068', '#f2efe9'],
  ['#f2b134', '#2b2d42', '#ef233c'],
  ['#0b0b0b', '#f5f5f5', '#9a9a9a'],
  ['#5e2750', '#f7a072', '#eddea4'],
  ['#3d5a80', '#ee6c4d', '#e0fbfc'],
  ['#e4d6a7', '#1c110a', '#9b2915'],
  ['#9ad1d4', '#003249', '#ccdbdc'],
  ['#8c2f39', '#fed0bb', '#461220'],
  ['#14213d', '#fca311', '#e5e5e5'],
  ['#c9ada7', '#22223b', '#4a4e69'],
  ['#386641', '#f2e8cf', '#bc4749'],
  ['#ff006e', '#3a0ca3', '#ffbe0b'],
  ['#2b2b2b', '#d4a373', '#fefae0'],
  ['#111111', '#ffffff', '#ffffff'],
]

const PATTERNS: CoverStyle['pattern'][] = ['rings', 'stripes', 'grid', 'wave', 'sun', 'noise']

function drawPattern(ctx: CanvasRenderingContext2D, S: number, style: CoverStyle, r: () => number) {
  const [bg, fg, ac] = style.palette
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, S, S)
  const cx = S * (0.35 + r() * 0.3)
  const cy = S * (0.35 + r() * 0.3)
  switch (style.pattern) {
    case 'rings':
      for (let i = 14; i > 0; i--) {
        ctx.strokeStyle = i % 3 === 0 ? ac : fg
        ctx.globalAlpha = 0.3 + (i % 2) * 0.5
        ctx.lineWidth = S * 0.012
        ctx.beginPath()
        ctx.arc(cx, cy, (i * S) / 26, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    case 'stripes': {
      const n = 6 + ((r() * 8) | 0)
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i % 2 ? fg : ac
        ctx.globalAlpha = 0.85
        ctx.fillRect(0, (i * S) / n + S * 0.02, S, S / n / 2)
      }
      break
    }
    case 'grid': {
      const n = 4 + ((r() * 4) | 0)
      const s = S / n
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          if (r() < 0.45) continue
          ctx.fillStyle = r() < 0.7 ? fg : ac
          ctx.fillRect(i * s + s * 0.1, j * s + s * 0.1, s * 0.8, s * 0.8)
        }
      break
    }
    case 'wave':
      // Joy-Division-esque stacked lines, but generated rather than copied.
      ctx.strokeStyle = fg
      ctx.lineWidth = S * 0.005
      for (let k = 0; k < 34; k++) {
        const y0 = S * 0.18 + k * S * 0.019
        ctx.beginPath()
        for (let x = S * 0.2; x <= S * 0.8; x += 3) {
          const mid = 1 - Math.abs(x / S - 0.5) * 3.2
          const bump = Math.max(0, mid) * (Math.sin(x * 0.07 + k) * 0.5 + 0.5 + r() * 0.6) * S * 0.06
          ctx.lineTo(x, y0 - bump)
        }
        ctx.stroke()
      }
      break
    case 'sun': {
      const g = ctx.createLinearGradient(0, 0, 0, S)
      g.addColorStop(0, bg)
      g.addColorStop(1, ac)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, S, S)
      ctx.fillStyle = fg
      ctx.beginPath()
      ctx.arc(S / 2, S * 0.62, S * 0.26, Math.PI, 0)
      ctx.fill()
      ctx.fillStyle = bg
      for (let i = 0; i < 6; i++) ctx.fillRect(0, S * 0.45 + i * S * 0.03 * (1 + i * 0.3), S, S * 0.008 * (i + 1))
      ctx.fillStyle = ac
      ctx.fillRect(0, S * 0.62, S, S * 0.4)
      break
    }
    case 'noise':
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = r() < 0.6 ? fg : ac
        ctx.globalAlpha = 0.2 + r() * 0.6
        const s = r() * S * 0.09
        ctx.beginPath()
        ctx.arc(r() * S, r() * S, s, 0, Math.PI * 2)
        ctx.fill()
      }
      break
  }
  ctx.globalAlpha = 1
}

function ageSleeve(ctx: CanvasRenderingContext2D, S: number, r: () => number) {
  // ring wear and edge scuffs make the sleeves feel handled
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = S * 0.02
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S * 0.44, 0, Math.PI * 2)
  ctx.stroke()
  speckle(ctx, 0, 0, S, S, S * 2, r, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.06)'], 1.5)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, S - 2, S - 2)
}

function drawCover(ctx: CanvasRenderingContext2D, ox: number, oy: number, S: number, i: number) {
  const r = rng(i * 7919 + 3)
  ctx.save()
  ctx.translate(ox, oy)
  ctx.beginPath()
  ctx.rect(0, 0, S, S)
  ctx.clip()
  const palette = PALETTES[i % PALETTES.length]
  drawPattern(ctx, S, { palette, pattern: PATTERNS[i % PATTERNS.length] }, r)
  const [band, album] = FICTIONAL_BANDS[i % FICTIONAL_BANDS.length]
  ctx.fillStyle = palette[1] === palette[0] ? '#fff' : palette[1]
  ctx.textAlign = 'left'
  const fs = fitText(ctx, band.toUpperCase(), '700', FONT_DISPLAY, S * 0.13, S * 0.86)
  ctx.font = `700 ${fs}px ${FONT_DISPLAY}`
  const top = i % 3 === 0
  ctx.fillText(band.toUpperCase(), S * 0.07, top ? S * 0.17 : S * 0.88)
  ctx.font = `italic 400 ${S * 0.07}px ${FONT_SERIF}`
  ctx.fillStyle = palette[2]
  ctx.fillText(album, S * 0.07, top ? S * 0.27 : S * 0.95 - fs)
  ageSleeve(ctx, S, r)
  ctx.restore()
}

/** 4x4 atlas of decorative album covers used by every instanced sleeve. */
export const ATLAS_GRID = 4
export const coverAtlas = () =>
  cached('coverAtlas', () => {
    const T = 512
    const { c, ctx } = canvas(T * ATLAS_GRID, T * ATLAS_GRID)
    for (let i = 0; i < ATLAS_GRID * ATLAS_GRID; i++) drawCover(ctx, (i % ATLAS_GRID) * T, Math.floor(i / ATLAS_GRID) * T, T, i)
    const t = toTexture(c)
    t.generateMipmaps = true
    return t
  })

/** Single decorative cover (for wall displays), sharing the drawing code with the atlas. */
export const coverTexture = (i: number) =>
  cached(`cover-${i}`, () => {
    const S = 512
    const { c, ctx } = canvas(S, S)
    drawCover(ctx, 0, 0, S, i)
    return toTexture(c)
  })

/** Sleeve artwork for a portfolio project, with a readable title. */
export const projectCover = (p: Project) =>
  cached(`project-${p.id}`, () => {
    const S = 512
    const { c, ctx } = canvas(S, S)
    const r = rng(hash(p.id))
    drawPattern(ctx, S, p.cover, r)
    const [bg, fg] = p.cover.palette
    // title band
    ctx.fillStyle = bg
    ctx.globalAlpha = 0.88
    ctx.fillRect(0, S * 0.7, S, S * 0.3)
    ctx.globalAlpha = 1
    ctx.fillStyle = fg
    const fs = fitText(ctx, p.title.toUpperCase(), '700', FONT_DISPLAY, 72, S * 0.88)
    ctx.font = `700 ${fs}px ${FONT_DISPLAY}`
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(p.title.toUpperCase(), S * 0.06, S * 0.7 + fs + 14)
    ctx.font = `500 26px ${FONT_BODY}`
    ctx.globalAlpha = 0.85
    ctx.fillText(`${p.tagline}  ·  ${p.year}`, S * 0.06, S * 0.96)
    ctx.globalAlpha = 1
    ageSleeve(ctx, S, r)
    return toTexture(c)
  })

const VENUES = ['The Crypt', 'Union Hall', 'Basement 45', 'The Lantern', 'Rialto', 'Electric Owl', 'Harbour Club']
const POSTER_COLORS: [string, string, string][] = [
  ['#151515', '#f0e6d2', '#d1495b'],
  ['#e9d8a6', '#001219', '#ae2012'],
  ['#9b2226', '#fefae0', '#e9c46a'],
  ['#264653', '#e9c46a', '#f4a261'],
  ['#000000', '#f72585', '#4cc9f0'],
  ['#f1faee', '#1d3557', '#e63946'],
  ['#3c1518', '#f2f3ae', '#d58936'],
  ['#2f2f2f', '#ffd166', '#ef476f'],
]

/** Fictional gig poster, portrait 2:3. */
export const posterTexture = (i: number) =>
  cached(`poster-${i}`, () => {
    const W = 512
    const H = 768
    const { c, ctx } = canvas(W, H)
    const r = rng(i * 104729 + 17)
    const [bg, fg, ac] = POSTER_COLORS[i % POSTER_COLORS.length]
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // big graphic
    const style = PATTERNS[(i + 2) % PATTERNS.length]
    ctx.save()
    ctx.translate(W * 0.08, H * 0.2)
    ctx.beginPath()
    ctx.rect(0, 0, W * 0.84, W * 0.84)
    ctx.clip()
    drawPattern(ctx, W * 0.84, { palette: [bg, ac, fg], pattern: style }, r)
    ctx.restore()
    const [band] = FICTIONAL_BANDS[(i * 5 + 3) % FICTIONAL_BANDS.length]
    ctx.fillStyle = fg
    ctx.textAlign = 'center'
    const fs = fitText(ctx, band.toUpperCase(), '700', FONT_DISPLAY, 92, W * 0.86)
    ctx.font = `700 ${fs}px ${FONT_DISPLAY}`
    ctx.fillText(band.toUpperCase(), W / 2, H * 0.15)
    ctx.font = `600 34px ${FONT_DISPLAY}`
    ctx.fillStyle = ac
    ctx.fillText(`LIVE AT ${VENUES[i % VENUES.length].toUpperCase()}`, W / 2, H * 0.86)
    ctx.font = `400 24px ${FONT_BODY}`
    ctx.fillStyle = fg
    ctx.fillText(`FRI ${10 + (i % 18)} · DOORS 8PM · ${5 + (i % 6)}`, W / 2, H * 0.92)
    // paper wear
    speckle(ctx, 0, 0, W, H, 3000, r, ['rgba(255,255,255,0.06)', 'rgba(0,0,0,0.08)'], 2)
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(60,40,10,0.35)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    return toTexture(c)
  })

/** The illuminated "VINYL ECSTATIC" lightbox face. */
export const mainSignTexture = () =>
  cached('mainSign', () => {
    const W = 1024
    const H = 256
    const { c, ctx } = canvas(W, H)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#fff3dc')
    g.addColorStop(1, '#f6dfb8')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#c8461d'
    // letters fill the face like the reference lightbox
    const fs = fitText(ctx, 'ECSTATIC', '700', FONT_DISPLAY, 118, W * 0.8)
    ctx.font = `700 ${fs}px ${FONT_DISPLAY}`
    ctx.fillText('VINYL', W / 2, H * 0.28)
    ctx.fillText('ECSTATIC', W / 2, H * 0.74)
    return toTexture(c, { anisotropy: 16 })
  })

/** Generic small sign: dark or light card with stacked lines of text. */
export const labelTexture = (
  key: string,
  lines: string[],
  { w = 512, h = 256, bg = '#f3ead8', fg = '#1d1a16', font = FONT_DISPLAY, border = true } = {},
) =>
  cached(`label-${key}`, () => {
    const { c, ctx } = canvas(w, h)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)
    if (border) {
      ctx.strokeStyle = fg
      ctx.globalAlpha = 0.6
      ctx.lineWidth = 6
      ctx.strokeRect(10, 10, w - 20, h - 20)
      ctx.globalAlpha = 1
    }
    ctx.fillStyle = fg
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const lh = (h - 40) / lines.length
    lines.forEach((l, i) => {
      const fs = fitText(ctx, l, '700', font, lh * 0.85, w - 50)
      ctx.font = `700 ${fs}px ${font}`
      ctx.fillText(l, w / 2, 20 + lh * (i + 0.5))
    })
    const r = rng(hash(key))
    speckle(ctx, 0, 0, w, h, 600, r, ['rgba(0,0,0,0.07)', 'rgba(255,255,255,0.05)'], 1.5)
    return toTexture(c)
  })

/** Wrapped-paragraph card (used for the counter "price list" and similar). */
export const noteTexture = (key: string, title: string, body: string) =>
  cached(`note-${key}`, () => {
    const W = 384
    const H = 512
    const { c, ctx } = canvas(W, H)
    ctx.fillStyle = '#f4ecd8'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#2a211a'
    ctx.font = `700 44px ${FONT_DISPLAY}`
    ctx.textAlign = 'center'
    ctx.fillText(title, W / 2, 70)
    ctx.font = `400 24px ${FONT_BODY}`
    ctx.textAlign = 'left'
    wrap(ctx, body, W - 50).forEach((l, i) => ctx.fillText(l, 25, 130 + i * 34))
    return toTexture(c)
  })

/** Record label + groove map for the vinyl disc top surface. Planar UVs, centre = (0.5, 0.5). */
export const vinylTexture = (labelColor = '#c0392b', key = 'default') =>
  cached(`vinyl-${key}`, () => {
    const S = 512
    const { c, ctx } = canvas(S, S)
    const { c: b, ctx: bx } = canvas(S, S)
    ctx.fillStyle = '#0c0c0d'
    ctx.fillRect(0, 0, S, S)
    bx.fillStyle = '#808080'
    bx.fillRect(0, 0, S, S)
    const r = rng(hash(key))
    for (let rad = S * 0.18; rad < S * 0.495; rad += 1.3) {
      const v = 10 + r() * 14
      ctx.strokeStyle = `rgb(${v},${v},${v + 1})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(S / 2, S / 2, rad, 0, Math.PI * 2)
      ctx.stroke()
      const bv = 100 + r() * 80
      bx.strokeStyle = `rgb(${bv},${bv},${bv})`
      bx.beginPath()
      bx.arc(S / 2, S / 2, rad, 0, Math.PI * 2)
      bx.stroke()
    }
    // track gaps
    for (const t of [0.26, 0.33, 0.4, 0.46]) {
      ctx.strokeStyle = '#050505'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(S / 2, S / 2, S * t, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = labelColor
    ctx.beginPath()
    ctx.arc(S / 2, S / 2, S * 0.165, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = `700 22px ${FONT_DISPLAY}`
    ctx.textAlign = 'center'
    ctx.fillText('VINYL ECSTATIC', S / 2, S * 0.43)
    ctx.font = `400 14px ${FONT_BODY}`
    ctx.fillText('33⅓ RPM · SIDE A', S / 2, S * 0.6)
    ctx.fillStyle = hsl(0, 0, 10)
    ctx.beginPath()
    ctx.arc(S / 2, S / 2, S * 0.012, 0, Math.PI * 2)
    ctx.fill()
    return { map: toTexture(c), bump: toTexture(b, { srgb: false }) }
  })
