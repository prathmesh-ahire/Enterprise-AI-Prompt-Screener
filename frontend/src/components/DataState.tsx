import type { ReactNode } from 'react'
import { Icon } from './Icon'

// LoadingState and EmptyState. Errors have their own component, PageMessage.
//
// LoadingState: the status line names the work in words; the spinner is decoration, and
// the skeleton bars stand in for the content to come. Nothing already loaded is hidden.
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="ps-loading" aria-busy="true">
      <p className="ps-loading__status" role="status">
        <span className="ps-spinner" aria-hidden="true" />
        {label}
      </p>
      <div className="ps-skel ps-skel--title" aria-hidden="true" />
      <div className="ps-skel" aria-hidden="true" />
      <div className="ps-skel" aria-hidden="true" />
    </div>
  )
}

// EmptyState: a title that states the fact, one sentence on when it fills, and at most
// one action, which is secondary because nothing is urgent. The caller keeps "nothing yet"
// and "nothing matches your filter" apart by what it passes in.
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="ps-empty">
      <span className="ps-empty__icon" aria-hidden="true">
        <Icon name="inbox" />
      </span>
      <p className="ps-empty__title">{title}</p>
      {hint && <p className="ps-empty__text">{hint}</p>}
      {action}
    </div>
  )
}
