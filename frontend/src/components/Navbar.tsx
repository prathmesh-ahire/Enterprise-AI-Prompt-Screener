import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { Button } from './Button'
import { RoleBadge } from './RoleBadge'

// todo 56A.7, the design's AppNavbar as C10 sets it out (design.md section 15): the
// wordmark · Prompt, History, Review queue · a separator · the admin links · then, on the
// right, the RoleBadge, the user ID and a small ghost "Log out". Each role sees only the
// links it can open, additive by role (ADMIN > REVIEWER > USER, as PromptService.resolveRole
// orders them). The "About" link joins in 56.5, once the public site it points to exists,
// and Audit log and Reports in 60.7, with their pages.
//
// Desktop only: one row at 1280px and up, so there is no collapsed menu any more. NavLink
// sets aria-current="page" on the current link, which is what draws its bottom bar.
export function Navbar() {
  const { username, role, logout } = useAuth()
  const navigate = useNavigate()
  const isReviewer = role === 'REVIEWER' || role === 'ADMIN'
  const isAdmin = role === 'ADMIN'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="ps-appbar">
      <span className="ps-wordmark">Prompt Screener</span>
      <nav className="ps-appnav" aria-label="App">
        <NavLink to="/prompt">Prompt</NavLink>
        <NavLink to="/history">History</NavLink>
        {isReviewer && <NavLink to="/review">Review queue</NavLink>}
        {isAdmin && (
          <>
            <span className="ps-appnav__sep" aria-hidden="true" />
            {/* `end`: NavLink matches by path prefix, so /admin would also light up on
                /admin/policy and /admin/models. */}
            <NavLink to="/admin" end>Admin dashboard</NavLink>
            <NavLink to="/admin/policy">Policy</NavLink>
            <NavLink to="/admin/models">Models</NavLink>
          </>
        )}
      </nav>
      <div className="ps-appbar__user">
        {role && <RoleBadge role={role} />}
        <span>{username}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>Log out</Button>
      </div>
    </header>
  )
}
