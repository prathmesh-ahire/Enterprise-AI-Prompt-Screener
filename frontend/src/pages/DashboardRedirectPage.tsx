import { Navigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

// /dashboard is where LoginPage sends everyone after sign-in, but no page is built for
// it (AdminPage lives at /admin). So /dashboard is a role-based landing redirect, not a
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
