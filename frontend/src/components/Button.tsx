import type { ButtonHTMLAttributes, ReactNode } from 'react'

// Most of
// the library is plain CSS classes; a button is one of the few places that needs real
// behaviour, so it gets a component. `loading` sets `disabled` as well as showing the
// spinner and aria-busy - otherwise an impatient second click fires the same request
// twice, which on /prompts/submit means two screened prompts and two history rows. The
// caller changes the label to the ongoing verb ("Screening…") so it always stays visible.
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'md' | 'sm'
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const classes = ['ps-btn', `ps-btn--${variant}`, size === 'sm' ? 'ps-btn--sm' : '', className]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      type="button"
      {...rest}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="ps-spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}
