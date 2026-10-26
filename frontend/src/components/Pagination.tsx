import { Button } from './Button'

// "Previous" and "Next" with "Page X of Y"
// between them, and no rows of page numbers. A button is disabled at its end, and the
// position is announced politely when it changes.
interface PaginationProps {
  page: number
  totalPages: number
  first: boolean
  last: boolean
  onPrevious: () => void
  onNext: () => void
}

export function Pagination({ page, totalPages, first, last, onPrevious, onNext }: PaginationProps) {
  return (
    <nav className="ps-pagination" aria-label="Pagination">
      <Button variant="secondary" size="sm" onClick={onPrevious} disabled={first}>Previous</Button>
      <span className="ps-pagination__label" aria-live="polite">
        Page {page + 1} of {Math.max(totalPages, 1)}
      </span>
      <Button variant="secondary" size="sm" onClick={onNext} disabled={last}>Next</Button>
    </nav>
  )
}
