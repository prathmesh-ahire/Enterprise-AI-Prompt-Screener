import type { ReactNode } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { percentFormat, recallPercent, type RecallRow } from '../content/evaluation'
import { ChartCard, ChartEmpty, useChartTokens } from './ChartCard'
import { entityLabel } from './EntityChips'

// A per-detector recall chart for the Evaluation page: one bar per detector in the brand
// colour on a grey track, with the percentage and the counts it was calculated from printed
// beside the chart, a plain table for screen readers and a tooltip. It shows recorded
// results, so the frame carries a SourceCaption passed in as `caption`. Nothing animates.
interface RecallChartProps {
  title: string
  subtitle: string
  rows: readonly RecallRow[]
  caption: ReactNode
}

const count = new Intl.NumberFormat('en')

function summary(row: RecallRow): string {
  return `${percentFormat.format(recallPercent(row))}% (${count.format(row.hit)} of ${count.format(row.of)})`
}

function RecallTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { name: string; text: string } }> }) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return (
    <div className="chart-tooltip">
      <span className="chart-tooltip-label">{row.name}</span>
      <span className="chart-tooltip-value">{row.text}</span>
    </div>
  )
}

export function RecallChart({ title, subtitle, rows, caption }: RecallChartProps) {
  const t = useChartTokens()
  const data = rows.map((r) => ({
    name: entityLabel(r.entityType),
    value: recallPercent(r),
    text: summary(r),
  }))
  const notes = rows.filter((r) => r.note)

  return (
    <ChartCard title={title} subtitle={subtitle} caption={caption}>
      {rows.length === 0
        ? <ChartEmpty message="No results were recorded for this set." />
        : (
          <>
            <div aria-hidden="true">
              <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 44)}>
                <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" domain={[0, 100]} unit="%" stroke={t.grid} tick={{ fill: t.axis, fontSize: 13 }} />
                  <YAxis type="category" dataKey="name" width={136} stroke={t.grid} tick={{ fill: t.axis, fontSize: 13 }} />
                  <Tooltip content={<RecallTooltip />} cursor={{ fill: t.track }} />
                  <Bar
                    dataKey="value"
                    fill={t.brand}
                    radius={[0, 4, 4, 0]}
                    background={{ fill: t.track, radius: 4 }}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="chart-legend">
              {data.map((d) => (
                <li key={d.name} className="chart-legend-item">
                  <span>{d.name}</span>
                  <span className="ps-num">{d.text}</span>
                </li>
              ))}
            </ul>
            {notes.map((r) => (
              <p key={r.entityType} className="ps-help">{entityLabel(r.entityType)}: {r.note}</p>
            ))}
            <table className="ps-sr">
              <caption>{title}</caption>
              <thead><tr><th>Detector</th><th>Recall</th></tr></thead>
              <tbody>
                {data.map((d) => <tr key={d.name}><td>{d.name}</td><td>{d.text}</td></tr>)}
              </tbody>
            </table>
          </>
        )}
    </ChartCard>
  )
}
