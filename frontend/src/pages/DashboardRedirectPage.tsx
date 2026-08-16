import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

// todo.md Phase 24.2 lists /dashboard as a route, and Phase 25.1 has LoginPage redirect
// there on success - but no phase builds a "DashboardPage" (Phase 30 builds AdminPage at
// /admin instead). Filling that gap: /dashboard is a role-based landing redirect, not a
// page of its own, so LoginPage doesn't need to know the user's role to decide where to
// send them.
const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  REVIEWER: '/review',
  USER: '/prompt',
}

export function DashboardRedirectPage() {
  const { role } = useAuth()
  return <Navigate to={(role && ROLE_HOME[role]) ?? '/prompt'} replace />
}
