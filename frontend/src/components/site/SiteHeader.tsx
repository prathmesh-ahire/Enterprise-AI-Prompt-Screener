import { Link, NavLink } from 'react-router-dom'
import { APP_ENTRY_PATH, PUBLIC_PAGES, WORDMARK } from '../../content/site'

// The public header: the wordmark, the seven public pages and one "Open the app" button,
// the same for every visitor. A signed-out visitor who follows it lands on sign-in. There is
// no glow on the header itself; the page below it carries the light. NavLink marks the
// current page with aria-current, which draws its bottom bar.
export function SiteHeader() {
  return (
    <header className="ps-site-head">
      <Link to="/" className="ps-wordmark">{WORDMARK}</Link>
      <nav className="ps-site-nav" aria-label="Main">
        {PUBLIC_PAGES.map((page) => (
          <NavLink key={page.path} to={page.path} end>{page.label}</NavLink>
        ))}
      </nav>
      <Link to={APP_ENTRY_PATH} className="ps-btn ps-btn--primary ps-btn--sm">Open the app</Link>
    </header>
  )
}
