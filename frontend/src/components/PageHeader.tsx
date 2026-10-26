import type { ReactNode } from 'react'

// The page's one h1 (28px) and a
// lead line capped at the reading width. The description is not decoration: several
// pages show figures over windows that are easy to misread, and one line of context at
// the top is the cheapest way to prevent that.
interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="ps-page-head">
      <div>
        <h1>{title}</h1>
        {description && <p className="ps-page-head__text">{description}</p>}
      </div>
      {actions && <div className="ps-row">{actions}</div>}
    </header>
  )
}
