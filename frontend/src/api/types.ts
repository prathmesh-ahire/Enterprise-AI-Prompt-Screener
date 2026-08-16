// Shape of every Spring Data Page<T> JSON response this app consumes. Shared by
// HistoryPage (28.2) and AdminPage's users/per-user-history panels (30.5/30.7).
export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  first: boolean
  last: boolean
}
