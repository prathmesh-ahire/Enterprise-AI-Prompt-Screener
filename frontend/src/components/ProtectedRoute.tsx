import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { AppShell } from './AppShell'

// todo.md Phase 24.5 - redirects unauthenticated users to /login for any route nested
// under this guard in App.tsx. Also mounts the app shell (Phase 46.1, which carries the
// Navbar added in Phase 25.6) here, since it only makes sense once a user is
// authenticated - every route behind this guard gets it for free.
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
