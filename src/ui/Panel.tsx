import { useEffect, useRef, useState } from 'react'
import type { InteractionTarget } from '../data/portfolio'
import { closePanel, openPanel, useStore } from '../state/store'
import { TargetContent, titleFor } from './content'

const same = (a: InteractionTarget | null, b: InteractionTarget | null) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Modal portfolio panel over the 3D scene. Focus moves into the dialog on
 * open, Tab is trapped inside, Escape closes and focus returns to whatever
 * had it before. Walking state is untouched while it is open.
 */
export function Panel() {
  const panel = useStore((s) => s.panel)
  const ref = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<Element | null>(null)
  const [history, setHistory] = useState<InteractionTarget[]>([])
  const prev = useRef<InteractionTarget | null>(null)
  const goingBack = useRef(false)

  useEffect(() => {
    if (panel && prev.current && !same(panel, prev.current) && !goingBack.current) setHistory((h) => [...h, prev.current!])
    if (!panel) setHistory([])
    goingBack.current = false
    prev.current = panel
  }, [panel])

  useEffect(() => {
    if (!panel) return
    returnFocus.current ??= document.activeElement
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    ref.current?.scrollTo?.(0, 0)
  }, [panel])

  useEffect(() => {
    if (panel) return
    const el = returnFocus.current as HTMLElement | null
    returnFocus.current = null
    el?.focus?.()
  }, [panel])

  if (!panel) return null

  const back = () => {
    const h = [...history]
    const last = h.pop()
    setHistory(h)
    goingBack.current = true
    if (last) openPanel(last)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      closePanel()
    }
    if (e.key === 'Tab' && ref.current) {
      const f = ref.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      if (!f.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <div className="panel-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closePanel()}>
      <div ref={ref} className="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title" onKeyDown={onKeyDown}>
        <header className="panel-head">
          {history.length > 0 && (
            <button className="icon-btn" onClick={back} aria-label="Back">
              ←
            </button>
          )}
          <h2 id="panel-title">{titleFor(panel)}</h2>
          <button className="icon-btn" onClick={closePanel} aria-label="Close panel" data-autofocus>
            ✕
          </button>
        </header>
        <div className="panel-body">
          <TargetContent target={panel} />
        </div>
      </div>
    </div>
  )
}
