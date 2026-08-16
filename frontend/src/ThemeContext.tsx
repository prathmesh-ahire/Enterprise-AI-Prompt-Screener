import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

// V1.1 Phase 44.6. Dark is the default: the design system's base :root is the dark
// palette and `[data-theme="light"]` is the override, so "no attribute" must mean dark.
export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'theme'
const DEFAULT_THEME: Theme = 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

// Read once, synchronously, before first paint - see the inline script in index.html,
// which applies the same value to <html> to avoid a flash of the wrong theme.
const readStoredTheme = (): Theme => {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    // Written on <html> rather than <body> so the CSS can key off :root[data-theme],
    // keeping tokens and their overrides on the same element.
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    [],
  )

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used inside a ThemeProvider')
  }
  return ctx
}
