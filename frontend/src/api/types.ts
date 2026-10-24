// Shape of every Spring Data Page<T> JSON response this app consumes. Shared by
// HistoryPage (28.2) and AdminPage's users/per-user-history panels (30.5/30.7).
// V2 Phase 55: ScoreBreakdownDto. Null for prompts screened before breakdowns were kept.
export interface ScoreBreakdown {
  components: { name: string; subScore: number; weight: number }[]
  scoreBand: string
  appliedOverrides: { rule: string; description: string }[]
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  first: boolean
  last: boolean
}
