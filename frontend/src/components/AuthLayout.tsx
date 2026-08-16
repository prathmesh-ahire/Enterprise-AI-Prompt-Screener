import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from './AppShell'

// todo.md Phase 47.1. The four auth pages (login, register, forgot, reset) were four
// separate bare forms with a bare <h1> and no shared frame. They now share one centred
// card on a branded background.
//
// The links between them live here rather than in each page, because that is the actual
// defect 47.1 names: /reset-password had no way back to login, and /forgot-password
// offered no way to register. Passing them in per page keeps each page's set correct
// while guaranteeing the treatment is identical.
//
// No behaviour change: every page keeps its own form, its own validation and its own
// submit handler untouched (Phase 47 is composition only).
interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  links?: ReactNode
}

export function AuthLayout({ title, subtitle, children, links }: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <div className="auth-page">
        <Link to="/login" className="auth-brand">{APP_NAME}</Link>

        <div className="card auth-card">
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
        </div>

        {links && <div className="form-links">{links}</div>}

        {/* Restating the offline guarantee on the first screen anyone sees is
            deliberate - it is this project's central claim. */}
        <p className="auth-footnote">Screens prompts locally. Nothing leaves this machine.</p>
      </div>
    </div>
  )
}
