import { useEffect, useRef, useState } from 'react'
import { interactions, owner, type SectionId } from '../data/portfolio'
import { input } from '../controls/input'
import { chooseQuality, getState, openPanel, setState, useStore, walkMode } from '../state/store'
import { SECTION_TITLES } from './content'

const SECTIONS: SectionId[] = ['home', 'projects', 'experience', 'about', 'contact']

function enterShop() {
  if (getState().isTouch) return setState({ mode: 'explore' })
  setState({ mode: 'paused' })
  const canvas = document.querySelector<HTMLCanvasElement>('.scene-canvas canvas')
  // Without pointer lock (unsupported, or blocked e.g. inside an iframe) fall
  // back to the drag-to-look and on-screen stick controls used on touch.
  const fallback = () => setState({ mode: 'explore', isTouch: true })
  if (!canvas?.requestPointerLock) return fallback()
  try {
    const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined
    p?.catch?.(fallback)
  } catch {
    fallback()
  }
}

export function Loading() {
  const progress = useStore((s) => s.loadProgress)
  return (
    <div className="screen loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden>
        <div className="disc" />
      </div>
      <p>Unlocking the shop… {Math.round(progress * 100)}%</p>
      <div className="bar">
        <div style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  )
}

export function Welcome() {
  const isTouch = useStore((s) => s.isTouch)
  const quality = useStore((s) => s.quality)
  const btn = useRef<HTMLButtonElement>(null)
  useEffect(() => btn.current?.focus(), [])
  return (
    <div className="screen welcome">
      <div className="welcome-card" role="dialog" aria-labelledby="welcome-title">
        <p className="eyebrow">Portfolio of {owner.name}</p>
        <h1 id="welcome-title">Vinyl Ecstatic</h1>
        <p className="lead">{owner.discipline}. Step inside: every record, sign and gadget in this shop opens part of my portfolio.</p>
        {isTouch ? (
          <ul className="controls">
            <li><kbd>Left stick</kbd> walk</li>
            <li><kbd>Drag</kbd> look around</li>
            <li><kbd>Tap</kbd> an object to open it</li>
          </ul>
        ) : (
          <ul className="controls">
            <li><kbd>W A S D</kbd> / <kbd>Arrows</kbd> walk · <kbd>Shift</kbd> run</li>
            <li><kbd>Mouse</kbd> look around</li>
            <li><kbd>E</kbd> open what you are looking at</li>
            <li><kbd>Esc</kbd> release the mouse / close panels</li>
          </ul>
        )}
        <div className="row">
          <button ref={btn} className="btn primary" onClick={enterShop}>
            Enter the shop
          </button>
          <button className="btn" onClick={() => setState({ classic: true })}>
            Classic portfolio
          </button>
        </div>
        <label className="quality">
          Graphics
          <select value={quality} onChange={(e) => chooseQuality(e.target.value as 'high' | 'low')}>
            <option value="high">High</option>
            <option value="low">Low (faster)</option>
          </select>
        </label>
      </div>
    </div>
  )
}

/** Shown when the pointer is released on desktop. Clicking resumes. */
export function Paused() {
  return (
    <button className="screen paused" onClick={enterShop} aria-label="Resume exploring">
      <span className="pill">Click to keep browsing</span>
    </button>
  )
}

export function Crosshair() {
  const hovered = useStore((s) => s.hovered)
  const isTouch = useStore((s) => s.isTouch)
  const it = hovered ? interactions[hovered] : null
  return (
    <>
      <div className={`crosshair ${it ? 'active' : ''}`} aria-hidden />
      <div className="prompt" aria-live="polite">
        {it && (
          <span className="pill">
            {isTouch ? 'Tap to' : <><kbd>E</kbd> to</>} {it.verb}
          </span>
        )}
      </div>
    </>
  )
}

/** Top bar: section shortcuts (keyboard-accessible navigation) and view controls. */
export function Hud() {
  const mode = useStore((s) => s.mode)
  const quality = useStore((s) => s.quality)
  const [open, setOpen] = useState(false)
  return (
    <nav className="hud" aria-label="Portfolio">
      <div className="hud-group">
        <button className="btn small" aria-expanded={open} aria-controls="hud-sections" onClick={() => setOpen((o) => !o)}>
          Sections
        </button>
        {open && (
          <ul id="hud-sections" className="menu">
            {SECTIONS.map((s) => (
              <li key={s}>
                <button
                  className="btn small ghost"
                  onClick={() => {
                    setOpen(false)
                    openPanel({ kind: 'section', section: s })
                  }}
                >
                  {s === 'home' ? 'Intro' : SECTION_TITLES[s]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="hud-group">
        <button
          className="btn small"
          aria-pressed={mode === 'overview'}
          onClick={() => setState({ mode: mode === 'overview' ? walkMode() : 'overview' })}
          title="Toggle a bird's-eye view of the shop"
        >
          {mode === 'overview' ? 'Walk' : 'Overview'}
        </button>
        <button className="btn small" onClick={() => setState((s) => ({ resetToken: s.resetToken + 1, mode: s.mode === 'overview' ? walkMode() : s.mode }))} title="Return to the entrance">
          Reset
        </button>
        <button className="btn small" onClick={() => chooseQuality(quality === 'high' ? 'low' : 'high')} title="Toggle graphics quality">
          {quality === 'high' ? 'HQ' : 'LQ'}
        </button>
        <button className="btn small" onClick={() => setState({ classic: true })}>
          Classic
        </button>
        <button className="btn small" onClick={() => setState({ mode: 'welcome' })} aria-label="Help and controls">
          ?
        </button>
      </div>
    </nav>
  )
}

/** Virtual joystick (left) + look pad (rest of screen) + use button for touch devices. */
export function MobileControls() {
  const hovered = useStore((s) => s.hovered)
  const stick = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const stickId = useRef<number | null>(null)
  const lookId = useRef<number | null>(null)
  const last = useRef({ x: 0, y: 0, t: 0, sx: 0, sy: 0 })

  const onStick = (e: React.PointerEvent) => {
    const el = stick.current!
    if (e.type === 'pointerdown') {
      stickId.current = e.pointerId
      el.setPointerCapture(e.pointerId)
    }
    if (stickId.current !== e.pointerId) return
    if (e.type === 'pointerup' || e.type === 'pointercancel') {
      stickId.current = null
      input.joyX = input.joyY = 0
      setKnob({ x: 0, y: 0 })
      return
    }
    const r = el.getBoundingClientRect()
    const R = r.width / 2
    let dx = (e.clientX - (r.left + R)) / R
    let dy = (e.clientY - (r.top + R)) / R
    const l = Math.hypot(dx, dy)
    if (l > 1) {
      dx /= l
      dy /= l
    }
    input.joyX = dx
    input.joyY = -dy
    setKnob({ x: dx * R * 0.6, y: dy * R * 0.6 })
  }

  const onLook = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement
    if (e.type === 'pointerdown') {
      lookId.current = e.pointerId
      el.setPointerCapture(e.pointerId)
      last.current = { x: e.clientX, y: e.clientY, t: performance.now(), sx: e.clientX, sy: e.clientY }
      return
    }
    if (lookId.current !== e.pointerId) return
    if (e.type === 'pointermove') {
      input.lookDX += e.clientX - last.current.x
      input.lookDY += e.clientY - last.current.y
      last.current.x = e.clientX
      last.current.y = e.clientY
      return
    }
    // pointerup: a short, still touch is a tap
    lookId.current = null
    const moved = Math.hypot(e.clientX - last.current.sx, e.clientY - last.current.sy)
    if (moved < 8 && performance.now() - last.current.t < 300) {
      input.tap = { x: (e.clientX / window.innerWidth) * 2 - 1, y: -(e.clientY / window.innerHeight) * 2 + 1 }
    }
  }

  return (
    <>
      <div className="lookpad" onPointerDown={onLook} onPointerMove={onLook} onPointerUp={onLook} onPointerCancel={onLook} />
      <div ref={stick} className="joystick" onPointerDown={onStick} onPointerMove={onStick} onPointerUp={onStick} onPointerCancel={onStick} aria-hidden>
        <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      {hovered && (
        <button className="btn primary use-btn" onClick={() => (input.usePressed = true)}>
          Open
        </button>
      )}
    </>
  )
}
