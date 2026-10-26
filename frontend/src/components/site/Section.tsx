import type { ReactNode } from 'react'
import { SectionHeader } from '../SectionHeader'

// One section of a public page: its header, then its content `space-9` below. `id` is the
// anchor the table of contents links to.
interface SectionProps {
  id?: string
  eyebrow: string
  title: string
  lead?: string
  children: ReactNode
}

export function Section({ id, eyebrow, title, lead, children }: SectionProps) {
  return (
    <section className="ps-section">
      <SectionHeader id={id} eyebrow={eyebrow} title={title} lead={lead} />
      <div className="ps-section__body">{children}</div>
    </section>
  )
}
