import { useEffect } from 'react'

// Pins the question screen to the visible viewport, so the on-screen keyboard shrinks the board
// instead of scrolling the page up. Chrome handles this via interactive-widget in index.html;
// iOS Safari ignores it, hence the visualViewport fallback. Skipped while pinch-zoomed.
export function useViewportLock() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    const sync = () => {
      if (vv.scale > 1.01) return
      root.style.setProperty('--app-height', `${vv.height}px`)
      window.scrollTo(0, 0)
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      root.style.removeProperty('--app-height')
    }
  }, [])
}
