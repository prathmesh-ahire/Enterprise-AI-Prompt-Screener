import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { AppShell } from './AppShell'

// Redirects unauthenticated users to /login for any route nested
// under this guard in App.tsx. Also mounts the app shell (which carries the
// Navbar) here, since it only makes sense once a user is
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
