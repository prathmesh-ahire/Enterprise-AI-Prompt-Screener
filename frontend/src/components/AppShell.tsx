import type { ReactNode } from 'react'
import { PRODUCT_NAME } from '../content/site'
import { Navbar } from './Navbar'

// The shell every authenticated route sits in: sticky navbar, a
// content region that owns the page gutters, and a slim footer with the full product name.
// The footer shows no version number.
export function AppShell({ children }: { children: ReactNode }) {
  // the app is the calm style, so the whole shell sits in
  // .ps-app, which turns the public glows and background off.
  return (
    <div className="ps-app app-shell">
      <Navbar />
      {/* <main> rather than a <div>: it is the page's one landmark region, and it gives
          the skip-to-content target a real destination. */}
      <main className="app-main" id="main-content">{children}</main>
      <footer className="app-footer">
        <span>{PRODUCT_NAME}</span>
      </footer>
    </div>
  )
}
