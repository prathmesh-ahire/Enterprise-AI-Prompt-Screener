import type { ReactNode } from 'react'

// todo.md Phase 46.4. Two of the three states a data-driven page needs.
//
// The THIRD state, error, deliberately has no component here. Errors in this app were
// never ad-hoc: every page already renders `<div className="banner banner-error">` with
// the message from extractErrorMessage, identically, in 16 places. The ad-hoc problem
// 46.4 exists to fix was in loading (eight different bare "Loading…" paragraphs, styled
// by nothing) and empty (messages indistinguishable from a page that had failed).
//
// Adding an ErrorState here would also have split the vocabulary rather than unifying
// it: of the six error state variables across these pages, only two are set purely by a
// failed load — the rest are shared with save and toggle actions, where "we couldn't
// load this page" is the wrong framing. One error surface used everywhere beats two used
// half the time each.
//
// The loading state is deliberately NOT a skeleton or a spinner-on-a-blank-page: 49.2
// requires that no animation runs on a page that is merely loading data, and a spinner
// that appears for 40ms on a fast local API is visual noise. A quiet labelled line is
// honest about what is happening and costs nothing to read.

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="data-state data-state-loading" role="status">
      {label}
    </p>
  )
}

// `hint` carries the distinction the history page depends on: "you have no prompts at
// all" and "no prompts match this filter" are different situations with different fixes,
// and collapsing them into one message tells a user with a filter applied that their
// history is empty when it is not.
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="data-state data-state-empty">
      <p className="data-state-title">{title}</p>
      {hint && <p className="data-state-hint">{hint}</p>}
      {action && <div className="data-state-action">{action}</div>}
    </div>
  )
}

