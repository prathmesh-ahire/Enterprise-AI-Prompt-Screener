import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { APP_NAME } from './AppShell'

// todo.md Phase 47.1, rebuilt to C10 in 56A.7 (design.md section 15b, "Sign-in pages"): the
// calm app style with no moving background, and one centred 400px solid card. The full
// product name sits above it (C8). The card holds the page's one h1, the form fields, one
// primary button, and the secondary links under the button. V1's two-column split, with
// its statement panel, is gone.
//
// The links live here rather than in each page, so every one of the four pages offers a
// way back to the others; each page passes its own set.
interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  links?: ReactNode
}

export function AuthLayout({ title, subtitle, children, links }: AuthLayoutProps) {
  return (
    <div className="ps-app auth-shell">
      <main className="auth-column" id="main-content">
        <Link to="/login" className="ps-wordmark auth-name">{APP_NAME}</Link>
        <div className="ps-card auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="ps-card__text">{subtitle}</p>}
          {children}
          {links && <div className="auth-links">{links}</div>}
        </div>
      </main>
    </div>
  )
}
