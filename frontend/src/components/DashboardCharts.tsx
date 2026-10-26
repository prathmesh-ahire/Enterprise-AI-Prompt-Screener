import {
  Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { ChartCard, ChartEmpty, ChartTooltip, useChartTokens } from './ChartCard'
import { DecisionBadge } from './DecisionBadge'
import { entityLabel } from './EntityChips'

// The risk-band donut is a decision chart, so it uses the five decision colours, each with its
// label, plus a legend with numbers and a plain table for screen readers. Every other chart
// uses only brand-base plus greys. No chart animates.
export interface RiskBandStat { riskBand: string; count: number }
export interface EntityStat { entityType: string; count: number }
export interface ProcessingTime { averageMs: number | null; maxMs: number | null }

const BAND_ORDER = ['ALLOW', 'MASK', 'CONFIRM', 'REVIEW', 'BLOCK']

export function RiskBandDonut({ data, updatedAt }: { data: RiskBandStat[]; updatedAt: Date | null }) {
  const t = useChartTokens()
  // Coloured from the decision tokens, so a slice matches its badge everywhere else.
  const bandColor: Record<string, string> = {
    ALLOW: t.allow, MASK: t.mask, CONFIRM: t.confirm, REVIEW: t.review, BLOCK: t.block,
  }
  const rows = BAND_ORDER
    .map((band) => ({ name: band, value: data.find((d) => d.riskBand === band)?.count ?? 0 }))
    .filter((r) => r.value > 0)

  return (
    <ChartCard
      title="Risk band distribution"
      subtitle="How decisions split across the five bands."
      window="last 7 days"
      updatedAt={updatedAt}
    >
      {rows.length === 0
        ? <ChartEmpty message="No prompts were screened in this window." />
        : (
          <>
            <div aria-hidden="true">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={rows}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={98}
                    paddingAngle={2}
                    stroke={t.surface}
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {rows.map((r) => <Cell key={r.name} fill={bandColor[r.name]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* The legend in the bands' own order (recharts' own sorts alphabetically, which
                reads like a severity ranking that is not one), each with its number. */}
            <ul className="chart-legend">
              {rows.map((r) => (
                <li key={r.name} className="chart-legend-item">
                  <DecisionBadge decision={r.name} />
                  <span className="ps-num">{r.value}</span>
                </li>
              ))}
            </ul>
            <table className="ps-sr">
              <caption>Risk band distribution, last 7 days</caption>
              <thead><tr><th>Decision</th><th>Prompts</th></tr></thead>
              <tbody>
                {rows.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.value}</td></tr>)}
              </tbody>
            </table>
          </>
        )}
    </ChartCard>
  )
}

export function EntityBreakdownChart({ data, updatedAt }: { data: EntityStat[]; updatedAt: Date | null }) {
  const t = useChartTokens()
  const rows = [...data]
    .sort((a, b) => b.count - a.count)
    .map((d) => ({ name: entityLabel(d.entityType), value: d.count }))

  return (
    <ChartCard
      title="Entity types detected"
      subtitle="How often each kind of sensitive item has been found."
      window="all time"
      updatedAt={updatedAt}
    >
      {rows.length === 0
        ? <ChartEmpty message="No sensitive items have been detected yet." />
        : (
          <>
            <div aria-hidden="true">
              <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 34)}>
                <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" allowDecimals={false} stroke={t.grid}
                    tick={{ fill: t.axis, fontSize: 13 }} />
                  <YAxis type="category" dataKey="name" width={136} stroke={t.grid}
                    tick={{ fill: t.axis, fontSize: 13 }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: t.track }} />
                  <Bar dataKey="value" fill={t.brand} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="ps-sr">
              <caption>Entity types detected, all time</caption>
              <thead><tr><th>Entity type</th><th>Count</th></tr></thead>
              <tbody>
                {rows.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.value}</td></tr>)}
              </tbody>
            </table>
          </>
        )}
    </ChartCard>
  )
}

// the live figures beside the recorded baseline, so the dashboard shows the query
// optimisation rather than only the report claiming it. The baseline is a recorded figure, so it
// carries its own dated source; no version label is shown.
const BASELINE_AVG_MS = 17.96
const BASELINE_MAX_MS = 89

export function ProcessingTimePanel({ data, updatedAt }: { data: ProcessingTime | null; updatedAt: Date | null }) {
  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v)}`)
  return (
    <ChartCard
      title="Screening performance"
      subtitle="Pipeline time, excluding the AI call. A query optimisation cut the database statements per prompt from 26 to 17; latency is shown for context, not as that claim."
      window="last 7 days"
      updatedAt={updatedAt}
    >
      <div className="ps-metrics">
        <div className="ps-metric">
          <p className={`ps-metric__value${data?.averageMs == null ? ' ps-metric__value--empty' : ''}`}>
            {fmt(data?.averageMs)}{data?.averageMs != null && <small>ms</small>}
          </p>
          <p className="ps-metric__label">Average</p>
        </div>
        <div className="ps-metric">
          <p className={`ps-metric__value${data?.maxMs == null ? ' ps-metric__value--empty' : ''}`}>
            {fmt(data?.maxMs)}{data?.maxMs != null && <small>ms</small>}
          </p>
          <p className="ps-metric__label">Maximum</p>
        </div>
        <div className="ps-metric">
          <p className="ps-metric__value">{BASELINE_AVG_MS}<small>ms</small></p>
          <p className="ps-metric__label">Recorded baseline average</p>
        </div>
        <div className="ps-metric">
          <p className="ps-metric__value">{BASELINE_MAX_MS}<small>ms</small></p>
          <p className="ps-metric__label">Recorded baseline maximum</p>
        </div>
      </div>
      <p className="ps-source">
        Baseline source: ScreeningPipelineLatencyTest, 50 prompts, AI model excluded · recorded 2026-08-05
      </p>
    </ChartCard>
  )
}
