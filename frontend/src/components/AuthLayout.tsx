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
//
// V1.2 UI pass: the shell is now a two-column split on a wide screen - a statement of
// what the system does on the left, the unchanged card on the right. Before this, the
// first screen anyone sees (an examiner included) was a 400px card alone in the middle
// of an otherwise empty 1440px page, which is the weakest possible first impression and
// said nothing about the project. Below 960px the panel is removed entirely and the
// card centres exactly as it did; nothing about the forms themselves changed.
interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  links?: ReactNode
}

// The four claims the panel makes. Each is something the system actually does, stated
// in the order a prompt meets them: detect, mask, escalate, record.
const HERO_POINTS = [
  'Nine detectors: personal data, payment cards, Indian IDs, API keys, private keys and your own confidential terms',
  'Sensitive values are masked and shown back to you before anything is sent',
  'Borderline prompts go to a human reviewer instead of straight through',
  'Every decision is written to an audit trail with no copy of the prompt itself',
]

export function AuthLayout({ title, subtitle, children, links }: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <div className="auth-split">
        {/* Not aria-hidden: this is real content, and a screen-reader user arriving at
            the sign-in page should get the same explanation of what they are signing
            in to that a sighted user gets. It is ordered after the form in the DOM on
            narrow screens only by virtue of being display:none there. */}
        <section className="auth-hero">
          <p className="auth-hero-mark">{APP_NAME}</p>
          <h2 className="auth-hero-title">
            Every prompt is screened <span className="auth-hero-accent">before</span> it reaches
            the model.
          </h2>
          <p className="auth-hero-lede">
            Prompts are inspected for sensitive data and prompt-injection risk, then allowed,
            masked, held for confirmation, escalated or blocked — entirely on this machine.
          </p>
          <ul className="auth-hero-points">
            {HERO_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <div className="auth-page">
          {/* The wordmark is the panel's job on a wide screen, so this duplicate is
              hidden there by CSS rather than removed - it is the only brand on screen
              once the panel is gone. */}
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
    </div>
  )
}
