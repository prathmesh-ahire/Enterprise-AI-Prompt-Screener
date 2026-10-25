import type { ReactNode } from 'react'
import { Navbar } from './Navbar'

// todo.md Phase 46.1. The shell every authenticated route sits in: sticky navbar, a
// content region that owns the page gutters, and a slim footer.
//
// Version is a constant rather than being read from package.json, which still says
// "0.0.0" - the frontend package version has never been maintained, and wiring a build
// define to an unmaintained field would just surface the wrong number. This string is the
// project milestone from todo.md, which is the number that actually means something here.
export const APP_NAME = 'Enterprise AI Prompt Screener'
export const APP_VERSION = 'V1.1'

export function AppShell({ children }: { children: ReactNode }) {
  // 56A.7: the app is the calm style (design.md section 11), so the whole shell sits in
  // .ps-app, which turns the public glows and background off.
  return (
    <div className="ps-app app-shell">
      <Navbar />
      {/* <main> rather than a <div>: it is the page's one landmark region, and it gives
          the skip-to-content target a real destination. */}
      <main className="app-main" id="main-content">{children}</main>
      <footer className="app-footer">
        <span>{APP_NAME}</span>
        <span aria-hidden="true">·</span>
        <span>{APP_VERSION}</span>
      </footer>
    </div>
  )
}
