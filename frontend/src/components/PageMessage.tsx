import type { ReactNode } from 'react'
import { Icon } from './Icon'

// Replaces V1's coloured banners.
// Errors use the field-error style - block text with a warning icon and a sentence on how
// to fix it - and role="alert", so a screen reader announces them. Success is a quiet
// text-secondary line with a check icon and role="status": no coloured box and no green,
// because a status is never green. Neither auto-hides; the caller clears it on the next
// action, as before.
export function PageMessage({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  return (
    <p className={`ps-message ps-message--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon name={kind === 'error' ? 'warning' : 'check'} />
      <span>{children}</span>
    </p>
  )
}
