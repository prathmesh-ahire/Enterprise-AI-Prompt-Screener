import type { ButtonHTMLAttributes, ReactNode } from 'react'

// todo.md Phase 45.1. Most of the library is plain CSS classes; a button is one of the
// few places that needs real behaviour, so it gets a component. `loading` sets `disabled`
// as well as showing the spinner - otherwise an impatient second click fires the same
// request twice, which on /prompts/submit means two screened prompts and two history rows.
type ButtonVariant = 'primary' | 'secondary' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  // The bare `.btn` class already renders primary, so only the other two add a modifier.
  const variantClass = variant === 'primary' ? '' : ` btn-${variant}`
  const extra = className ? ` ${className}` : ''

  return (
    // type defaults to "button" but stays overridable by ...rest, so a form's submit
    // button can still opt in. Left as the default because React's own default is
    // "submit", which silently submits the surrounding form on any stray click.
    <button
      type="button"
      {...rest}
      className={`btn${variantClass}${extra}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}
