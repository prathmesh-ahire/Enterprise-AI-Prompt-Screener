// todo.md Phase 27.4, reworked in V2 56A.4 (design.md C11, F1). The fill is coloured from
// the band the API returns (scoreBreakdown.scoreBand) - the live policy's band, so it stays
// right after an admin changes the thresholds. A prompt screened before breakdowns were
// stored has no band, so its bar takes the decision's colour instead. The UI never
// computes a band from the score, and the app shows no fixed 25/50/65/75 notches.
const BANDS = new Set(['ALLOW', 'MASK', 'CONFIRM', 'REVIEW', 'BLOCK'])

interface RiskScoreBarProps {
  score: number | null
  band?: string | null
  decision?: string | null
}

export function RiskScoreBar({ score, band, decision }: RiskScoreBarProps) {
  if (score === null) return null
  const clamped = Math.max(0, Math.min(100, score))
  const colourBand = [band, decision].find((b): b is string => !!b && BANDS.has(b))
  return (
    <div className="risk-score-bar-wrap">
      <div className="risk-score-label">
        <span>Prompt Risk Score</span>
        <span>{Math.round(clamped)} / 100</span>
      </div>
      <div className="risk-score-track">
        <div
          className={`risk-score-fill${colourBand ? ` risk-score-${colourBand.toLowerCase()}` : ''}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
