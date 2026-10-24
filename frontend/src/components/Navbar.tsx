import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { APP_NAME } from './AppShell'

// todo.md Phase 25.6. Links are additive by role (matches the ADMIN > REVIEWER > USER
// hierarchy already used elsewhere, e.g. PromptService.resolveRole): REVIEWER sees
// everything USER sees plus Review Queue; ADMIN sees everything REVIEWER sees plus the
// three admin links.
//
// Phase 46.3 makes it collapsible. The menu is CSS-hidden above the breakpoint rather
// than conditionally rendered, so the links stay in the DOM in one order and there is
// only ever one set of NavLinks to keep correct.
export function Navbar() {
  const { username, role, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Navigating with the menu open would otherwise leave it covering the page you just
  // asked for - the single most common mobile-nav bug.
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className={`navbar${menuOpen ? ' navbar-open' : ''}`}>
      <span className="navbar-brand">{APP_NAME}</span>

      {/* Only rendered as a control below the breakpoint (CSS), but it stays in the tab
          order there and carries its own state for screen readers. */}
      <button
        type="button"
        className="navbar-toggle"
        aria-expanded={menuOpen}
        aria-controls="navbar-menu"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="navbar-toggle-bars" aria-hidden="true" />
      </button>

      <div className="navbar-links" id="navbar-menu">
        <NavLink to="/prompt">Prompt</NavLink>
        <NavLink to="/history">History</NavLink>
        {(role === 'REVIEWER' || role === 'ADMIN') && <NavLink to="/review">Review Queue</NavLink>}
        {role === 'ADMIN' && (
          <>
            {/* `end` matters here: NavLink matches by path PREFIX by default, so /admin
                also matched /admin/policy and /admin/models — two links lit up as the
                active route at once, on every admin sub-page. The other five links have
                no sub-routes, so only this one needs it. */}
            <NavLink to="/admin" end>Admin Panel</NavLink>
            <NavLink to="/admin/policy">Policy</NavLink>
            <NavLink to="/admin/models">Models</NavLink>
          </>
        )}

        {/* 45.2: the account controls carry their own class so they don't inherit the
            uppercase link treatment or the gradient underline meant for navigation.
            V1.2 UI pass: they are now wrapped, so they travel as one unit. On the
            desktop bar this changes nothing visible; in the collapsed mobile panel
            (which stacks its children) it is what finally delivers the "account
            controls sit together on one row" the 46.3 comment has always claimed —
            before the wrapper they stacked one per line, four rows deep. */}
        <div className="navbar-account">
        <span className="navbar-user">{username}</span>
        {role && <span className="role-badge">{role}</span>}
        {/* V1.2 UI pass: was a `.btn-link` — a bare underlined hyperlink sitting
            between a pill-shaped role badge and the theme switch, which read as a
            stray link rather than as the one control that ends the session. It is
            now a compact outlined pill in the same uppercase micro type as the role
            badge beside it, so the three account controls read as one cluster. The
            icon is inline rather than from public/icons.svg: that sprite is Vite
            template leftovers (bluesky, discord, github) and carries nothing we use. */}
        <button type="button" className="navbar-logout" onClick={handleLogout}>
          <svg
            className="navbar-logout-icon"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            {/* A door with the arrow leaving it: the panel is open on the exit side
                so the arrow reads as passing through rather than pointing at a wall. */}
            <path d="M6 14H3.5A1.5 1.5 0 0 1 2 12.5v-9A1.5 1.5 0 0 1 3.5 2H6" />
            <path d="M10.5 11 14 8l-3.5-3" />
            <path d="M14 8H6" />
          </svg>
          Logout
        </button>
        </div>
      </div>
    </nav>
  )
}
