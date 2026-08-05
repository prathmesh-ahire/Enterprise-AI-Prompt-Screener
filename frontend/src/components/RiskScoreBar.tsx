// todo.md Phase 27.4. Band cutoffs match PolicyDecisionEngine's own ALLOW/MASK/CONFIRM/
// REVIEW/BLOCK bands (backend Phase 11.2.2) exactly - CONFIRM and REVIEW both fall in the
// same 50-74 "orange" band here since this bar only has the 4 colours todo.md names, not
// a 5th one to split them further.
function bandFor(score: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (score < 25) return 'green'
  if (score < 50) return 'yellow'
  if (score < 75) return 'orange'
  return 'red'
}

export function RiskScoreBar({ score }: { score: number | null }) {
  if (score === null) return null
  const clamped = Math.max(0, Math.min(100, score))
  const band = bandFor(clamped)
  return (
    <div className="risk-score-bar-wrap">
      <div className="risk-score-label">
        <span>Prompt Risk Score</span>
        <span>{Math.round(clamped)} / 100</span>
      </div>
      <div className="risk-score-track">
        <div className={`risk-score-fill risk-score-${band}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}
