import type { ReactNode } from 'react'
import { PageHeader } from '../PageHeader'
import { PUBLIC_PAGE } from '../../content/site'

// The frame of a public page: the page's name and one-line purpose from the content module,
// then its content.
export function PublicPage({ path, children }: { path: string; children?: ReactNode }) {
  const page = PUBLIC_PAGE[path]
  return (
    <div className="public-page">
      <PageHeader title={page.label} description={page.description} />
      {children}
    </div>
  )
}
