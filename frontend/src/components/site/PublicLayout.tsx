import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { LoadingState } from '../DataState'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

// The shell every public route and the Not Found page sit in. `.ps-public` switches on the
// showcase style for everything inside it. The pages load on demand, so the sign-in pages
// and the app never download them.
export function PublicLayout() {
  return (
    <div className="ps-public">
      <SiteHeader />
      <main id="main-content">
        <Suspense fallback={<div className="public-page"><LoadingState /></div>}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}
