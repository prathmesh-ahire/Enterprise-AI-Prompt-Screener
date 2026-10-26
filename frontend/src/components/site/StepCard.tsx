import type { ReactNode } from 'react'

// One step of a real sequence, with its two-digit number. Only for sequences - never for a
// list of things that happen in no order. Glass on public pages; in the app the active card
// is a lighter surface. At most one card in a row is `active`.
interface StepCardProps {
  step: number
  title: string
  children: ReactNode
  active?: boolean
}

export function StepCard({ step, title, children, active = false }: StepCardProps) {
  return (
    <article className={`ps-step${active ? ' ps-step--active' : ''}`}>
      <span className="ps-step__num">{String(step).padStart(2, '0')}</span>
      <h3 className="ps-step__title">{title}</h3>
      <p className="ps-step__text">{children}</p>
    </article>
  )
}
