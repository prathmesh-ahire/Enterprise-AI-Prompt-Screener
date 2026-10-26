import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, type Role } from '../AuthContext'

// For pages needing a role restriction beyond "authenticated" -
// ProtectedRoute only guards that. The ADMIN-only pages reuse this same
// component rather than each page duplicating its own redirect check.
export function RoleProtectedRoute({ allow }: { allow: Role[] }) {
  const { role } = useAuth()

  if (!role || !allow.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
