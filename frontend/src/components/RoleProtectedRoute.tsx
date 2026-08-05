import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, type Role } from '../AuthContext'

// todo.md Phase 29.1 is the first page needing a role restriction beyond "authenticated" -
// ProtectedRoute (24.5) only guards that. Phase 31.1/32.1 (ADMIN-only) reuse this same
// component rather than each page duplicating its own redirect check.
export function RoleProtectedRoute({ allow }: { allow: Role[] }) {
  const { role } = useAuth()

  if (!role || !allow.includes(role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
