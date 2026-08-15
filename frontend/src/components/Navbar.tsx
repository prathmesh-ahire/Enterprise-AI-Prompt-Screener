import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { APP_NAME } from './AppShell'
import { ThemeToggle } from './ThemeToggle'

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
            <NavLink to="/admin">Admin Panel</NavLink>
            <NavLink to="/admin/policy">Policy</NavLink>
            <NavLink to="/admin/models">Models</NavLink>
          </>
        )}

        {/* 45.2: the account controls carry their own class so they don't inherit the
            uppercase link treatment or the gradient underline meant for navigation. */}
        <span className="navbar-user">{username}</span>
        {role && <span className="role-badge">{role}</span>}
        {/* 44.7: theme switch sits with the account controls, not the navigation links */}
        <ThemeToggle />
        <button type="button" className="btn-link" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}
