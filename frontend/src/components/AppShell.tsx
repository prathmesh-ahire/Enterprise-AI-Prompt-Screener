import type { ReactNode } from 'react'
import { Navbar } from './Navbar'

// The shell every authenticated route sits in: sticky navbar, a
// content region that owns the page gutters, and a slim footer.
//
// the full product name, used on the sign-in pages and in the footer. The
// footer shows no version: version numbers are a developer term and never shown to users.
export const APP_NAME = 'Enterprise AI Prompt Screener'

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
        <span>{APP_NAME}</span>
      </footer>
    </div>
  )
}
