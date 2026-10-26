import type { ReactNode } from 'react'
import { ColorBendsZone } from './ColorBendsZone'
import { HeroGlow } from './HeroGlow'
import { TableOfContents, type TocItem } from './TableOfContents'

// A long public page: the moving background, the page's one hero, then the table of contents
// on the left and the sections beside it.
interface Action {
  label: string
  to: string
}

interface ContentPageProps {
  title: string
  lead: string
  primary: Action
  secondary: Action
  toc: TocItem[]
  children: ReactNode
}

export function ContentPage({ title, lead, primary, secondary, toc, children }: ContentPageProps) {
  return (
    <ColorBendsZone>
      <HeroGlow title={title} lead={lead} primary={primary} secondary={secondary} />
      <div className="public-page">
        <div className="ps-toc-layout">
          <TableOfContents items={toc} />
          <div className="ps-sections">{children}</div>
        </div>
      </div>
    </ColorBendsZone>
  )
}
