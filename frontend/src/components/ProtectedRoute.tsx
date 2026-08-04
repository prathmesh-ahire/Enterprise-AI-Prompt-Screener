import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { Navbar } from './Navbar'

// todo.md Phase 24.5 - redirects unauthenticated users to /login for any route nested
// under this guard in App.tsx. Also mounts Navbar (Phase 25.6) here, since it only makes
// sense once a user is authenticated - every route behind this guard gets it for free.
export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  )
}
