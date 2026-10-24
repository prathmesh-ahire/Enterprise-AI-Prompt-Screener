// Coloured by the *decision* itself, not a row's raw score - an 11.2.3 hard override (e.g.
// a REVIEW forced by an injection phrase on an otherwise low-scoring prompt) needs to still
// read as elevated, since that's exactly the case a score-coloured badge would misrepresent
// as "safe." Same 4-colour language as RiskScoreBar/EntityChips, reused as a mapping of a
// different key (decision, not score). Shared by HistoryPage (Phase 28) and AdminPage's
// per-user history view (Phase 30.5), so both colour decisions identically.
const DECISION_BAND: Record<string, 'green' | 'yellow' | 'orange' | 'cyan' | 'red'> = {
  ALLOW: 'green',
  MASK: 'yellow',
  CONFIRM: 'orange',
  REVIEW: 'cyan',
  BLOCK: 'red',
}

export function decisionBadgeClass(decision: string): string {
  return `badge-band-${DECISION_BAND[decision] ?? 'green'}`
}
