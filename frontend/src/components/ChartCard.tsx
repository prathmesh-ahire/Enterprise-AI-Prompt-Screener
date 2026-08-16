import { useEffect, useState, type ReactNode } from 'react'

// todo.md Phase 48.1. The shared frame every chart on the dashboard sits in.
//
// The `period` prop is not decoration and is deliberately REQUIRED. This dashboard's
// panels genuinely use three different windows — summary cards are today only, entity
// stats are all-time, and risk distribution / processing time / repeated violations are
// the last 7 days. NOTE.md records that discrepancy being mistaken for a bug during
// manual testing ("the card says 3 blocked, the database says 30"). A chart that states
// its own window turns the most common "is your dashboard broken?" question at viva into
// a point in favour.
interface ChartCardProps {
  title: string
  subtitle?: string
  period: string
  children: ReactNode
}

export function ChartCard({ title, subtitle, period, children }: ChartCardProps) {
  return (
    <section className="chart-card">
      <header className="chart-card-head">
        <div>
          <h3 className="chart-title">{title}</h3>
          {subtitle && <p className="chart-subtitle">{subtitle}</p>}
        </div>
        <span className="chart-period">{period}</span>
      </header>
      <div className="chart-body">{children}</div>
    </section>
  )
}

// Recharts renders SVG, which cannot read a CSS custom property — `fill="var(--accent)"`
// resolves to nothing inside an SVG attribute. Every colour therefore has to be handed to
// it as a literal, which means reading the tokens off the document at runtime and
// re-reading them when the theme changes. Without the re-read, switching to light mode
// leaves the charts painted in the dark palette (axis labels included) while everything
// around them flips — the single most likely way for a themed chart to look broken.
export function useChartTokens() {
  const read = () => {
    const s = getComputedStyle(document.documentElement)
    const t = (name: string) => s.getPropertyValue(name).trim()
    return {
      accent: t('--accent'),
      grid: t('--border'),
      axis: t('--text-muted'),
      text: t('--text-primary'),
      surface: t('--surface-raised'),
      border: t('--border-strong'),
      allow: t('--decision-allow'),
      mask: t('--decision-mask'),
      confirm: t('--decision-confirm'),
      block: t('--decision-block'),
      critical: t('--severity-critical'),
      high: t('--severity-high'),
      medium: t('--severity-medium'),
    }
  }

  const [tokens, setTokens] = useState(read)

  useEffect(() => {
    // data-theme is written onto <html> by ThemeProvider (44.6), so observing that one
    // attribute is enough — no event bus needed, and it also catches the pre-paint value
    // set by the inline script in index.html.
    const observer = new MutationObserver(() => setTokens(read()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return tokens
}

// One tooltip for every chart, built from the same tokens rather than recharts' default
// white box — which is invisible-on-invisible in dark mode.
export function ChartTooltip({ active, payload, label, suffix = '' }: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; payload?: { name?: string } }>
  label?: string | number
  suffix?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0]
  const name = label ?? row.payload?.name ?? row.name
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{name}</span>
      <span className="chart-tooltip-value">{row.value}{suffix}</span>
    </div>
  )
}

// Recharts draws an axis and an empty plot area when handed an empty array, which reads
// as a broken chart rather than "nothing happened in this window" (48.6).
export function ChartEmpty({ message }: { message: string }) {
  return <p className="chart-empty">{message}</p>
}
