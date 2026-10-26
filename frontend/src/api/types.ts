// Shape of every Spring Data Page<T> JSON response this app consumes. Shared by
// HistoryPage and AdminPage's users/per-user-history panels (29.1.5/29.1.7).
// ScoreBreakdownDto. Null for prompts screened before breakdowns were kept.
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

// One row of /api/audit/my-history and /api/audit/all. Types and counts only, never prompt
// content. The user is null when the event has none or the account no longer exists.
export interface AuditEvent {
  id: number
  userId: number | null
  username: string | null
  action: string
  requestId: string | null
  riskBand: string | null
  createdAt: string
}
