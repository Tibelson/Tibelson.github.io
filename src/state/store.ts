import { useSyncExternalStore } from 'react'
import type { InteractionTarget } from '../data/portfolio'

/**
 * Tiny global store shared by the 3D scene and the HTML overlay. Kept
 * dependency-free on purpose; swap for zustand if it grows.
 */

export type Mode =
  | 'loading' // assets being generated
  | 'welcome' // intro screen with controls
  | 'explore' // walking around (pointer locked on desktop)
  | 'paused' // pointer released, overlay shows "click to resume"
  | 'overview' // orbit camera, dollhouse view
export type Quality = 'high' | 'low'

export interface AppState {
  mode: Mode
  /** Panel opened over the scene, if any. Navigation state is untouched while open. */
  panel: InteractionTarget | null
  /** interactId currently under the crosshair. */
  hovered: string | null
  quality: Quality
  /** Plain HTML portfolio instead of (or because of failed) 3D. */
  classic: boolean
  webglFailed: boolean
  loadProgress: number
  isTouch: boolean
  /** Bumped to ask the controls to return to the spawn point. */
  resetToken: number
}

const prefersLow =
  typeof window !== 'undefined' &&
  (matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4)

let state: AppState = {
  mode: 'loading',
  panel: null,
  hovered: null,
  quality: (localStorageGet('ve-quality') as Quality) ?? (prefersLow ? 'low' : 'high'),
  classic: new URLSearchParams(location.search).has('classic'),
  webglFailed: false,
  loadProgress: 0,
  isTouch: typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches,
  resetToken: 0,
}

const listeners = new Set<() => void>()

export function getState() {
  return state
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const p = typeof patch === 'function' ? patch(state) : patch
  let changed = false
  for (const k in p) if ((p as Record<string, unknown>)[k] !== (state as unknown as Record<string, unknown>)[k]) changed = true
  if (!changed) return
  state = { ...state, ...p }
  if (p.quality) localStorageSet('ve-quality', p.quality)
  listeners.forEach((l) => l())
}

export function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useStore<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => select(state))
}

export const openPanel = (panel: InteractionTarget) => setState({ panel })
export const closePanel = () => setState({ panel: null })

function localStorageGet(k: string) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function localStorageSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* storage unavailable: preference just isn't remembered */
  }
}
