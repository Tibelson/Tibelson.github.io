// Exports the procedurally generated shop to public/models/vinyl-store.glb.
//
// Usage:
//   npm run build && npx vite preview --port 4173 &
//   npm run export:glb            # or: node scripts/export-glb.mjs http://localhost:4173
//
// Requires Playwright (`npm i -D playwright && npx playwright install chromium`).
// Headless Chromium renders with SwiftShader, so expect this to take a minute.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:4173'
const out = new URL('../public/models/vinyl-store.glb', import.meta.url)

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 640, height: 400 } })
await page.addInitScript(() => localStorage.setItem('ve-quality', 'low'))
const download = page.waitForEvent('download', { timeout: 300_000 })
await page.goto(`${base}/?export`)
const file = await download
await mkdir(new URL('.', out), { recursive: true })
await file.saveAs(out.pathname)
console.log('wrote', out.pathname)
await browser.close()
