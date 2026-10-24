import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { apiClient } from './api/client'

export type Role = 'USER' | 'REVIEWER' | 'ADMIN'

interface AuthState {
  token: string | null
  username: string | null
  role: Role | null
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean
  login: (token: string, username: string, role: Role) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// B12/B13: a tampered or deleted token used to still render the page shell, since the old
// check was only `token !== null` - the invalid token was caught only once an actual API
// call was made. This decodes the JWT payload and checks `exp` client-side (no signature
// verification, since that needs the server's secret - a background auth-check call was
// the other option the test report suggested, but this needs no extra request). Any
// malformed token (edited, truncated, emptied to '') fails to parse and is treated as absent.
function isValidToken(token: string | null): boolean {
  if (!token) {
    return false
  }
  const parts = token.split('.')
  if (parts.length !== 3) {
    return false
  }
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

function readInitialState(): AuthState {
  const token = localStorage.getItem('token')
  if (!isValidToken(token)) {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('role')
    return { token: null, username: null, role: null }
  }
  return {
    token,
    username: localStorage.getItem('username'),
    role: localStorage.getItem('role') as Role | null,
  }
}

// todo.md Phase 24.4. login() stores the JWT in localStorage (see api/client.ts's own
// note on the accepted XSS trade-off); logout() calls the backend logout endpoint
// (Phase 5.1.6, audit-only - there's no server-side session to destroy) but clears local
// state regardless of whether that call succeeds, so the user is never stuck "logged in"
// client-side just because the network request failed.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(readInitialState)

  const login = (token: string, username: string, role: Role) => {
    localStorage.setItem('token', token)
    localStorage.setItem('username', username)
    localStorage.setItem('role', role)
    setState({ token, username, role })
  }

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout')
    } catch {
      // best-effort - still clear local state even if the request failed
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('role')
      setState({ token: null, username: null, role: null })
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, isAuthenticated: state.token !== null, login, logout }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
