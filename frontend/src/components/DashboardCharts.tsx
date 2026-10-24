import {
  Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { ChartCard, ChartEmpty, ChartTooltip, useChartTokens } from './ChartCard'
import { entityLabel } from './EntityChips'

// todo.md Phase 48.2-48.5. All three charts live here rather than inline in AdminPage,
// which is already 440 lines.

export interface RiskBandStat { riskBand: string; count: number }
export interface EntityStat { entityType: string; count: number }
export interface ProcessingTime { averageMs: number | null; maxMs: number | null }

// Fixed order, so the donut's slices don't reshuffle between loads as counts change —
// and so the legend reads in severity order rather than in whatever order the API
// happened to return. Matches PolicyDecisionEngine's own band progression.
const BAND_ORDER = ['ALLOW', 'MASK', 'CONFIRM', 'REVIEW', 'BLOCK']

// Same tiering as EntityChips (which mirrors RiskSubScoreCalculator.SEVERITY_WEIGHT), so
// a bar's colour agrees with the chip colour for the same entity everywhere else.
const ENTITY_TIER: Record<string, 'critical' | 'high' | 'medium'> = {
  PRIVATE_KEY: 'critical', API_KEY: 'critical', PASSWORD_SECRET: 'critical',
  PAYMENT_CARD: 'high', AADHAAR_LIKE_ID: 'high', ORG_CONFIDENTIAL: 'high',
  PAN_LIKE_ID: 'medium', PHONE_NUMBER: 'medium', PERSONAL_EMAIL: 'medium',
}

// ============================================================================
// 48.3 — Risk band distribution as a donut
// ============================================================================
export function RiskBandDonut({ data }: { data: RiskBandStat[] }) {
  const t = useChartTokens()
  // Coloured from the decision-band tokens, so a slice matches its badge colour
  // everywhere else in the app. REVIEW has its own cyan (56A.4); each slice is also
  // labelled with its own name, so colour is never the only signal.
  const bandColor: Record<string, string> = {
    ALLOW: t.allow, MASK: t.mask, CONFIRM: t.confirm, REVIEW: t.review, BLOCK: t.block,
  }

  const rows = BAND_ORDER
    .map((band) => ({ name: band, value: data.find((d) => d.riskBand === band)?.count ?? 0 }))
    .filter((r) => r.value > 0)

  return (
    <ChartCard
      title="Risk Band Distribution"
      subtitle="How decisions split across the five bands"
      period="Last 7 days"
    >
      {rows.length === 0
        ? <ChartEmpty message="No prompts were screened in this window." />
        : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={62}
                outerRadius={98}
                paddingAngle={3}
                stroke={t.surface}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {rows.map((r) => <Cell key={r.name} fill={bandColor[r.name] ?? t.accent} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              {/* A custom legend, rendered straight from `rows`. Left to derive its own,
                  recharts sorts alphabetically — ALLOW, BLOCK, CONFIRM, MASK, REVIEW —
                  which puts BLOCK second and reads as a severity ranking that is not one,
                  the exact misreading the traffic-light colours exist to prevent. Its
                  `payload` prop is not assignable on an in-chart Legend in recharts 3.x
                  (the type omits it), so `content` is the supported way to control this. */}
              <Legend
                verticalAlign="bottom"
                height={30}
                content={() => (
                  <ul className="chart-legend">
                    {rows.map((r) => (
                      <li key={r.name} className="chart-legend-item">
                        <span className="chart-legend-swatch"
                          style={{ background: bandColor[r.name] ?? t.accent }} />
                        {r.name}
                      </li>
                    ))}
                  </ul>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
    </ChartCard>
  )
}

// ============================================================================
// 48.2 / 48.4 — Entity breakdown, replacing the hand-rolled CSS bar chart
// ============================================================================
export function EntityBreakdownChart({ data }: { data: EntityStat[] }) {
  const t = useChartTokens()
  const tierColor = { critical: t.critical, high: t.high, medium: t.medium }

  // Sorted by count so the chart answers "what leaks most" at a glance — the old CSS bar
  // chart rendered in whatever order the endpoint returned.
  const rows = [...data]
    .sort((a, b) => b.count - a.count)
    .map((d) => ({
      name: entityLabel(d.entityType),
      value: d.count,
      fill: tierColor[ENTITY_TIER[d.entityType] ?? 'medium'],
    }))

  return (
    <ChartCard
      title="Entity Types Detected"
      subtitle="Coloured by severity tier: critical, high, medium"
      // Explicitly all-time. This endpoint applies no date filter at all, and it sits
      // beside two 7-day panels and a set of today-only cards.
      period="All time"
    >
      {rows.length === 0
        ? <ChartEmpty message="No sensitive entities have been detected yet." />
        : (
          <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 34)}>
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" allowDecimals={false} stroke={t.axis}
                tick={{ fill: t.axis, fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={128} stroke={t.axis}
                tick={{ fill: t.axis, fontSize: 12 }} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: t.grid }} />
              <Bar dataKey="value" radius={[0, 5, 5, 0]} isAnimationActive={false}>
                {rows.map((r) => <Cell key={r.name} fill={r.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
    </ChartCard>
  )
}

// ============================================================================
// 48.5 — Processing time against the recorded baseline
// ============================================================================
// The V1.0 baseline from todo.md Phase 38 / NOTE.md. Shown so the dashboard demonstrates
// the Phase 43 optimisation rather than the report merely claiming it.
//
// Honesty note carried from NOTE.md's Phase 43 entry: the measured win was a QUERY-COUNT
// reduction (26 statements per submission -> 17), not a latency one. Latency barely moved
// on H2, where an in-memory query is nearly free. The subtitle says exactly that, so the
// panel cannot be read as claiming a speed-up it did not demonstrate.
const BASELINE_AVG_MS = 17.96
const BASELINE_MAX_MS = 89

export function ProcessingTimePanel({ data }: { data: ProcessingTime | null }) {
  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v)} ms`)

  return (
    <ChartCard
      title="Screening Performance"
      subtitle="Pipeline time excluding the AI call. Phase 43's measured win was 26 → 17 database statements per submission; latency is shown for context, not as the claim."
      period="Last 7 days"
    >
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card-value">{fmt(data?.averageMs)}</div>
          <div className="stat-card-label">Average</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{fmt(data?.maxMs)}</div>
          <div className="stat-card-label">Maximum</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{BASELINE_AVG_MS} ms</div>
          <div className="stat-card-label">V1.0 baseline avg</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{BASELINE_MAX_MS} ms</div>
          <div className="stat-card-label">V1.0 baseline max</div>
        </div>
      </div>
    </ChartCard>
  )
}
