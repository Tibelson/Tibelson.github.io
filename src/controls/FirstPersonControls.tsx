import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { PLAYER } from '../scene/layout'
import { getState, setState, useStore } from '../state/store'
import { buildColliders, resolveCollisions } from './collision'
import { MOVE_KEYS, input, isDown } from './input'

const MOUSE_SENS = 0.0022
const TOUCH_SENS = 0.005
const PITCH_LIMIT = THREE.MathUtils.degToRad(80)
const ACCEL = 12 // how quickly velocity reaches its target (1/s)
const GRAVITY = 9.81

/**
 * First-person walker: pointer-lock mouse look, WASD/arrows, touch joystick,
 * cylinder-vs-rectangle collisions and gravity onto the floor. Position and
 * orientation live in refs, so opening panels or switching to overview and
 * back never loses the visitor's place.
 */
export function FirstPersonControls() {
  const { camera, gl } = useThree()
  const mode = useStore((s) => s.mode)
  const panel = useStore((s) => s.panel)
  const resetToken = useStore((s) => s.resetToken)
  const isTouch = useStore((s) => s.isTouch)
  const colliders = useMemo(() => buildColliders(), [])

  const pos = useRef(new THREE.Vector3(PLAYER.spawn.x, PLAYER.eyeHeight + 0.4, PLAYER.spawn.z))
  const vel = useRef(new THREE.Vector3())
  const yaw = useRef<number>(PLAYER.spawn.yaw)
  const pitch = useRef(-0.05)
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), [])

  const active = (mode === 'explore' || mode === 'paused') && !panel

  // reset to spawn
  useEffect(() => {
    if (resetToken === 0) return
    pos.current.set(PLAYER.spawn.x, PLAYER.eyeHeight, PLAYER.spawn.z)
    vel.current.set(0, 0, 0)
    yaw.current = PLAYER.spawn.yaw
    pitch.current = -0.05
  }, [resetToken])

  // ?debug exposes a teleport hook for screenshots and QA scripts
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('debug')) return
    ;(window as unknown as Record<string, unknown>).__veTeleport = (x: number, z: number, yawRad: number, pitchRad = 0) => {
      pos.current.set(x, PLAYER.eyeHeight, z)
      yaw.current = yawRad
      pitch.current = pitchRad
    }
    ;(window as unknown as Record<string, unknown>).__veSet = setState
    ;(window as unknown as Record<string, unknown>).__veDebug = () => ({
      state: getState(),
      pos: pos.current.toArray(),
      yaw: yaw.current,
      pitch: pitch.current,
      camera: camera.position.toArray(),
      rot: camera.rotation.toArray(),
      info: { ...gl.info.memory, ...gl.info.render, programs: gl.info.programs?.length },
    })
  }, [camera, gl])

  // pointer lock + mouse look (desktop)
  useEffect(() => {
    const el = gl.domElement
    const onClick = () => {
      const s = getState()
      if (s.isTouch || s.panel) return
      if (s.mode === 'explore' || s.mode === 'paused') el.requestPointerLock?.()
    }
    const onLockChange = () => {
      const locked = document.pointerLockElement === el
      const s = getState()
      if (locked) setState({ mode: 'explore' })
      else if (s.mode === 'explore' && !s.isTouch) setState({ mode: 'paused' })
    }
    const onMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== el) return
      yaw.current -= e.movementX * MOUSE_SENS
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * MOUSE_SENS, -PITCH_LIMIT, PITCH_LIMIT)
    }
    el.addEventListener('click', onClick)
    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('mousemove', onMove)
    return () => {
      el.removeEventListener('click', onClick)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMove)
    }
  }, [gl])

  // release the pointer whenever a panel opens or we leave explore mode
  useEffect(() => {
    if ((panel || mode === 'overview' || mode === 'welcome') && document.pointerLockElement) document.exitPointerLock()
  }, [panel, mode])

  // keyboard
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return
      input.keys.add(e.code)
      if (e.code === 'KeyE' && !e.repeat) input.usePressed = true
      // stop arrow keys scrolling the page while walking
      if (getState().mode === 'explore' && e.code.startsWith('Arrow')) e.preventDefault()
    }
    const up = (e: KeyboardEvent) => input.keys.delete(e.code)
    const blur = () => input.keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  const wish = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    if (getState().mode === 'overview') return

    // touch look
    if (input.lookDX || input.lookDY) {
      yaw.current -= input.lookDX * TOUCH_SENS
      pitch.current = THREE.MathUtils.clamp(pitch.current - input.lookDY * TOUCH_SENS, -PITCH_LIMIT, PITCH_LIMIT)
      input.lookDX = input.lookDY = 0
    }

    // desired horizontal velocity in view space
    let fx = 0
    let fz = 0
    const canMove = active && (mode === 'explore' || isTouch)
    if (canMove) {
      fz = (isDown(MOVE_KEYS.forward) ? 1 : 0) - (isDown(MOVE_KEYS.back) ? 1 : 0) + input.joyY
      fx = (isDown(MOVE_KEYS.right) ? 1 : 0) - (isDown(MOVE_KEYS.left) ? 1 : 0) + input.joyX
    }
    const len = Math.hypot(fx, fz)
    if (len > 1) {
      fx /= len
      fz /= len
    }
    const speed = isDown(MOVE_KEYS.run) ? PLAYER.runSpeed : PLAYER.walkSpeed
    const sin = Math.sin(yaw.current)
    const cos = Math.cos(yaw.current)
    // forward is -Z rotated by yaw
    wish.set((fx * cos - fz * sin) * speed, 0, (-fx * sin - fz * cos) * speed)
    const k = 1 - Math.exp(-ACCEL * dt)
    vel.current.x += (wish.x - vel.current.x) * k
    vel.current.z += (wish.z - vel.current.z) * k

    // gravity onto the floor (eye height above y = 0)
    vel.current.y -= GRAVITY * dt
    const p = pos.current
    p.x += vel.current.x * dt
    p.z += vel.current.z * dt
    p.y += vel.current.y * dt
    if (p.y <= PLAYER.eyeHeight) {
      p.y = PLAYER.eyeHeight
      vel.current.y = 0
    }
    resolveCollisions(p, PLAYER.radius, colliders)

    camera.position.copy(p)
    euler.set(pitch.current, yaw.current, 0)
    camera.quaternion.setFromEuler(euler)
  })

  return null
}
