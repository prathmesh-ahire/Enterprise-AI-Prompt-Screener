import type { ScoreBreakdown as ScoreBreakdownDto } from '../api/types'
import { ScoreBreakdown } from './ScoreBreakdown'
import { rowsFromDto } from './breakdownRows'

// How a score was made, for a prompt the app screened: the breakdown, then one sentence when a
// rule raised the decision above the band the score alone gave. A prompt screened before
// breakdowns were kept has none, and says so in one quiet line.
//
// `own` is for the person who wrote the prompt ("Your score put this in MASK"); the rest of the
// app speaks about someone else's prompt.
interface BreakdownPanelProps {
  breakdown: ScoreBreakdownDto | null
  decision: string
  riskScore: number | null
  own?: boolean
}

export function BreakdownPanel({ breakdown, decision, riskScore, own = false }: BreakdownPanelProps) {
  if (!breakdown) {
    return (
      <p className="ps-help">
        No breakdown was recorded for this prompt, because it was screened before breakdowns were kept.
      </p>
    )
  }
  const rows = rowsFromDto(breakdown)
  const total = riskScore ?? rows.reduce((sum, r) => sum + r.score * r.weight * 100, 0)
  const overrides = breakdown.appliedOverrides
  return (
    <div className="ps-stack">
      <ScoreBreakdown rows={rows} total={total} decision={decision} caption="How the risk score was made" />
      {overrides.length > 0 && (
        <p className="ps-card__text">
          {own ? 'Your' : 'The'} score put this in {breakdown.scoreBand}. {overrides.map((o) => o.description).join(' ')}
        </p>
      )}
    </div>
  )
}
