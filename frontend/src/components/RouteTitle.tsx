import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { APP_PAGE_LABELS, NOT_FOUND, PUBLIC_PAGE, pageTitle } from '../content/site'

// Keeps the browser tab's title in step with the route: "<page> · Enterprise AI Prompt
// Screener" for every address, with the Not Found title for anything that is not a page.
export function RouteTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
    const label = PUBLIC_PAGE[path]?.label ?? APP_PAGE_LABELS[path] ?? (path === '/dashboard' ? null : NOT_FOUND.title)
    if (label) document.title = pageTitle(label)
  }, [pathname])
  return null
}
