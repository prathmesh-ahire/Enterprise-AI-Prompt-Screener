import { useState, type ReactNode } from 'react'
import { LiveSourceCaption } from './SourceCaption'

// The shared frame every chart sits in: an app Card with a title, one line of
// context, the chart, and one SourceCaption for the panel stating its window and when it
// was loaded.
//
// The window is deliberately REQUIRED. This dashboard's panels genuinely use three
// different windows - summary cards are today only, entity stats are all-time, and risk
// distribution / processing time / repeated violations are the last 7 days. That discrepancy was once
// mistaken for a bug during manual testing ("the card says 3
// blocked, the database says 30"). V1's period pill was only a label, so the caption
// replaces it.
//
// A chart on a public page shows recorded figures, not live ones, so it passes its own
// `caption` (a SourceCaption naming the source and the day it was recorded) instead of a
// window and a load time. It is the same Card either way: solid in the app, glass on a
// public page.
type ChartCardProps = {
  title: string
  subtitle?: string
  children: ReactNode
} & ({ window: string; updatedAt: Date | null } | { caption: ReactNode })

export function ChartCard(props: ChartCardProps) {
  const { title, subtitle, children } = props
  return (
    <section className="ps-card chart-card">
      <h3 className="ps-card__title">{title}</h3>
      {subtitle && <p className="ps-card__text">{subtitle}</p>}
      <div className="chart-body">{children}</div>
      {'caption' in props ? props.caption : <LiveSourceCaption window={props.window} updatedAt={props.updatedAt} />}
    </section>
  )
}

// Recharts renders SVG, which cannot read a CSS custom property — `fill="var(--brand-base)"`
// resolves to nothing inside an SVG attribute. Every colour therefore has to be handed to
// it as a literal, which means reading the tokens off the document at runtime. The UI is
// dark only, so the tokens never change after load and are read once.
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
// box: surface-raised, a line-strong border and shadow-pop.
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
// as a broken chart rather than "nothing happened in this window".
export function ChartEmpty({ message }: { message: string }) {
  return <p className="chart-empty">{message}</p>
}
