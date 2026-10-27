import { Component, type ReactNode } from 'react'

/** Catches a crashing 3D scene so the portfolio can fall back to the classic layout. */
export class ErrorBoundary extends Component<{ onError: (e: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('3D scene failed, falling back to classic layout', error)
    this.props.onError(error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
