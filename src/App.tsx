import { Suspense, lazy, useEffect, useState } from 'react'
import { setState, useStore } from './state/store'
import { Classic } from './ui/Classic'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { Crosshair, Hud, Loading, MobileControls, Paused, Welcome } from './ui/Overlay'
import { Panel } from './ui/Panel'

// The 3D environment is its own chunk: the classic portfolio never downloads it.
const Experience = lazy(() => import('./scene/Experience'))

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const failTo3D = () => setState({ webglFailed: true, classic: true })

export default function App() {
  const classic = useStore((s) => s.classic)
  const mode = useStore((s) => s.mode)
  const panel = useStore((s) => s.panel)
  const isTouch = useStore((s) => s.isTouch)
  const [assetsReady, setAssetsReady] = useState(false)

  useEffect(() => {
    if (!webglAvailable()) failTo3D()
  }, [])

  useEffect(() => {
    if (classic || assetsReady) return
    let cancelled = false
    // Loaded lazily with the scene so the classic layout never pulls in three.js.
    import('./scene/prepare')
      .then((m) => m.prepareAssets())
      .then(() => !cancelled && setAssetsReady(true))
      .catch((e) => {
        console.error(e)
        failTo3D()
      })
    return () => {
      cancelled = true
    }
  }, [classic, assetsReady])

  useEffect(() => {
    document.body.classList.toggle('is-classic', classic)
  }, [classic])

  if (classic) return <Classic />

  return (
    <div className="app">
      {assetsReady && (
        <ErrorBoundary onError={failTo3D}>
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </ErrorBoundary>
      )}
      {mode === 'loading' && <Loading />}
      {mode === 'welcome' && <Welcome />}
      {mode === 'paused' && !panel && !isTouch && <Paused />}
      {(mode === 'explore' || mode === 'paused') && !panel && <Crosshair />}
      {mode === 'explore' && isTouch && !panel && <MobileControls />}
      {mode !== 'loading' && mode !== 'welcome' && <Hud />}
      <Panel />
    </div>
  )
}
