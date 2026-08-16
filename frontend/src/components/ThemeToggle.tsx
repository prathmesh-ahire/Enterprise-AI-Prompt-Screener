import { useTheme } from '../ThemeContext'

/**
 * V1.1 Phase 44.7 — the navbar's dark/light switch.
 *
 * Built on a real `<input type="checkbox">` rather than a styled `<div>`, so it is
 * focusable, operable with Space, and announced correctly by a screen reader for free.
 * The visible track and knob are the sibling `<span>`, driven entirely by `:checked`.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <label
      className="theme-switch"
      title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
    >
      <input
        type="checkbox"
        className="theme-switch-input"
        checked={!isLight}
        onChange={toggleTheme}
        aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
      />
      <span className="theme-switch-slider" aria-hidden="true" />
    </label>
  )
}
