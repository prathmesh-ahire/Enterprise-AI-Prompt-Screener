// The fill is coloured from the band the API returns
// (scoreBreakdown.scoreBand) - the live policy's band, so it stays right after an admin
// changes the thresholds. A prompt screened before breakdowns were stored has no band, so
// its bar takes the decision's colour instead. The UI never computes a band from the
// score, and the app shows no fixed 25/50/65/75 notches. The number is always printed,
// so the bar is never the only signal.
const BANDS = new Set(['ALLOW', 'MASK', 'CONFIRM', 'REVIEW', 'BLOCK'])

interface RiskScoreBarProps {
  score: number | null
  band?: string | null
  decision?: string | null
}

export function RiskScoreBar({ score, band, decision }: RiskScoreBarProps) {
  if (score === null) return null
  const clamped = Math.max(0, Math.min(100, score))
  const rounded = Math.round(clamped)
  const colourBand = [band, decision].find((b): b is string => !!b && BANDS.has(b))
  return (
    <div
      className="ps-score"
      role="meter"
      aria-label="Risk score"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
      aria-valuetext={`${rounded} out of 100${decision ? `, ${decision}` : ''}`}
    >
      <div className="ps-score__head">
        <span className="ps-score__label">Risk score</span>
        <span className="ps-score__value">
          {rounded}
          <small> / 100</small>
        </span>
      </div>
      <div className="ps-score__track">
        <div
          className={`ps-score__fill${colourBand ? ` bg-${colourBand.toLowerCase()}` : ''}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
