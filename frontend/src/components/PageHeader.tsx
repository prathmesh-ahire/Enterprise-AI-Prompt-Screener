import type { ReactNode } from 'react'

// todo.md Phase 46.2. One header pattern for every page, so a heading is never a bare
// <h1> again. The description is not decoration: several of these pages show figures over
// windows that are easy to misread (the dashboard's cards are today-only while the panels
// below them are all-time or 7-day), and one line of context at the top is the cheapest
// place to say so.
interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        <h1>{title}</h1>
        {description && <p className="page-header-description">{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}
