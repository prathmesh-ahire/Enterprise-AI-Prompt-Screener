import type { ReactNode } from 'react'

// todo.md Phase 45.7. The glyph is not decoration: it is what makes the four variants
// tell apart without relying on hue, which 49.1 requires and which matters here because
// warning (amber) and error (red) are the pair most often confused. `role="alert"` is
// used only for errors - it interrupts a screen reader, which is right for a failure and
// wrong for a success confirmation.
type AlertKind = 'success' | 'error' | 'warning' | 'info'

const ALERT_GLYPH: Record<AlertKind, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
}

interface AlertProps {
  kind: AlertKind
  title?: string
  children: ReactNode
}

export function Alert({ kind, title, children }: AlertProps) {
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="alert-icon" aria-hidden="true">{ALERT_GLYPH[kind]}</span>
      <div className="alert-body">
        {title && <p className="alert-title">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}
