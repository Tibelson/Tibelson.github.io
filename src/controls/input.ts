/**
 * Shared, mutable input state written by DOM handlers (keyboard, touch
 * joystick, look pad) and read every frame by the controls. Kept outside React
 * so high-frequency input never triggers re-renders.
 */
export const input = {
  keys: new Set<string>(),
  /** Virtual joystick, -1..1. y > 0 = forward. */
  joyX: 0,
  joyY: 0,
  /** Accumulated look delta in pixels since last frame (touch look pad). */
  lookDX: 0,
  lookDY: 0,
  /** Pending tap in normalised device coordinates, consumed by the interactor. */
  tap: null as null | { x: number; y: number },
  /** Set by the "Use" button / E key, consumed by the interactor. */
  usePressed: false,
}

export const MOVE_KEYS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
}

export const isDown = (codes: string[]) => codes.some((c) => input.keys.has(c))
