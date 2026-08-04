import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'

// todo.md Phase 24.5 - redirects unauthenticated users to /login for any route nested
// under this guard in App.tsx.
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
