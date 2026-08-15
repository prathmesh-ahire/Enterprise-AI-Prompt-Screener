import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { ThemeToggle } from './ThemeToggle'

// todo.md Phase 25.6. Links are additive by role (matches the ADMIN > REVIEWER > USER
// hierarchy already used elsewhere, e.g. PromptService.resolveRole): REVIEWER sees
// everything USER sees plus Review Queue; ADMIN sees everything REVIEWER sees plus the
// three admin links.
export function Navbar() {
  const { username, role, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <span className="navbar-brand">Enterprise AI Prompt Screener</span>

      <div className="navbar-links">
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

        <span>{username}</span>
        {role && <span className="role-badge">{role}</span>}
        {/* 44.7: theme switch sits with the account controls, not the navigation links */}
        <ThemeToggle />
        <button type="button" className="btn-link" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}
