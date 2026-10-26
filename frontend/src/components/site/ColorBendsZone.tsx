import { useEffect, useRef, type ReactNode } from 'react'
import { mountColorBends } from './colorBends'

// Wraps everything from the hero to the end of <main> (never the footer) and puts the moving
// background behind it. The canvas is the zone's first child, aria-hidden and out of the
// way of the pointer; the page's content (in its own wrapper, in the same grid cell) sits
// above it and never waits for it. It is mounted after the first paint and stopped on
// unmount, so a route change frees it. Public pages only - the app never renders this.
//
// The bands are weak everywhere so text over them stays readable. Only the Home page passes
// its hero as `hero`: the bands are at full strength behind it, and the rest of the page
// (`children`) sits on a veil that brings them back down to the weak level.
export function ColorBendsZone({ hero, children }: { hero?: ReactNode; children: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => (canvas.current ? mountColorBends(canvas.current) : undefined), [])
  return (
    <div className={`ps-bends-zone${hero ? ' ps-bends-zone--home' : ''}`}>
      <div className="ps-bends-bg" aria-hidden="true">
        <canvas className="ps-bends-canvas" ref={canvas} />
      </div>
      <div className="ps-bends-content">
        {hero}
        {hero ? <div className="ps-bends-veil">{children}</div> : children}
      </div>
    </div>
  )
}
