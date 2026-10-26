import { DecisionBadge } from './DecisionBadge'
import type { BreakdownRow } from './breakdownRows'

// How a risk score was made: one row per sub-score with its bar, its value, its weight and
// what it adds, then a total row. Each row's "Adds" is the sub-score times its weight times
// 100, so the rows sum to the total and the weights to 1.00.
//
// Nothing is typed here. The names and weights come from the API's breakdown in the app and
// from the pipeline snapshot on the public pages, through the adapters in breakdownRows.ts. The bars
// are always the brand colour, never a decision colour.
const number = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })
const weightFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface ScoreBreakdownProps {
  rows: BreakdownRow[]
  total: number
  decision: string
  caption: string
}

export function ScoreBreakdown({ rows, total, decision, caption }: ScoreBreakdownProps) {
  const weightSum = rows.reduce((sum, r) => sum + r.weight, 0)
  return (
    <div className="ps-breakdown" role="table" aria-label={caption}>
      <div className="ps-breakdown__row ps-breakdown__row--head" role="row">
        <span role="columnheader">Sub-score</span>
        <span role="columnheader">0–100</span>
        <span className="ps-num" role="columnheader">Score</span>
        <span className="ps-num" role="columnheader">Weight</span>
        <span className="ps-num" role="columnheader">Adds</span>
      </div>
      {rows.map((r) => (
        <div className="ps-breakdown__row" role="row" key={r.key}>
          <span role="cell">{r.label}</span>
          <span className="ps-breakdown__bar" role="cell">
            <i style={{ width: `${Math.max(0, Math.min(100, r.score * 100))}%` }} />
          </span>
          <span className="ps-num" role="cell">{number.format(r.score * 100)}</span>
          <span className="ps-num ps-muted" role="cell">× {weightFormat.format(r.weight)}</span>
          <span className="ps-num" role="cell">{number.format(r.score * r.weight * 100)}</span>
        </div>
      ))}
      <div className="ps-breakdown__row ps-breakdown__row--total" role="row">
        <span className="ps-row" role="cell">
          Total
          <DecisionBadge decision={decision} />
        </span>
        <span className="ps-breakdown__gap" role="cell" />
        <span role="cell" />
        <span className="ps-num ps-muted" role="cell">{weightFormat.format(weightSum)}</span>
        <span className="ps-num" role="cell">{number.format(total)}</span>
      </div>
    </div>
  )
}
