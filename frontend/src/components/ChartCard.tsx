import { useState, type ReactNode } from 'react'
import { LiveSourceCaption } from './SourceCaption'

// todo.md Phase 48.1, on the design in 56A.7 (design.md section 15b, Charts and Live-number
// captions). The shared frame every chart sits in: an app Card with a title, one line of
// context, the chart, and one SourceCaption for the panel stating its window and when it
// was loaded.
//
// The window is deliberately REQUIRED. This dashboard's panels genuinely use three
// different windows - summary cards are today only, entity stats are all-time, and risk
// distribution / processing time / repeated violations are the last 7 days. NOTE.md records
// that discrepancy being mistaken for a bug during manual testing ("the card says 3
// blocked, the database says 30"). V1's period pill was only a label, so the caption
// replaces it.
interface ChartCardProps {
  title: string
  subtitle?: string
  window: string
  updatedAt: Date | null
  children: ReactNode
}

export function ChartCard({ title, subtitle, window, updatedAt, children }: ChartCardProps) {
  return (
    <section className="ps-card chart-card">
      <h3 className="ps-card__title">{title}</h3>
      {subtitle && <p className="ps-card__text">{subtitle}</p>}
      <div className="chart-body">{children}</div>
      <LiveSourceCaption window={window} updatedAt={updatedAt} />
    </section>
  )
}

// Recharts renders SVG, which cannot read a CSS custom property — `fill="var(--brand-base)"`
// resolves to nothing inside an SVG attribute. Every colour therefore has to be handed to
// it as a literal, which means reading the tokens off the document at runtime. The UI is
// dark only (56A.3), so the tokens never change after load and are read once.
export function useChartTokens() {
  const read = () => {
    const s = getComputedStyle(document.documentElement)
    const t = (name: string) => s.getPropertyValue(name).trim()
    return {
      brand: t('--brand-base'),
      track: t('--surface-hover'),
      grid: t('--line-subtle'),
      axis: t('--text-muted'),
      surface: t('--surface-card'),
      allow: t('--allow'),
      mask: t('--mask'),
      confirm: t('--confirm'),
      review: t('--review'),
      block: t('--block'),
    }
  }

  const [tokens] = useState(read)
  return tokens
}

// One tooltip for every chart, built from the tokens rather than recharts' default white
// box: surface-raised, a line-strong border and shadow-pop (design.md 15b).
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
