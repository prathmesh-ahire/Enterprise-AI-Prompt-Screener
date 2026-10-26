import { useState } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { downloadBlob } from '../api/download'
import { Button } from '../components/Button'
import { FieldError } from '../components/FieldError'
import { PageHeader } from '../components/PageHeader'
import { PageMessage } from '../components/PageMessage'

// ADMIN only (enforced by RoleProtectedRoute in App.tsx). Exports the screening figures for a
// date range as CSV or PDF. Both dates are optional; the server uses the last 7 days when
// they are left empty.
type Format = 'csv' | 'pdf'

// Today as YYYY-MM-DD in the browser's own time zone, which is what the date fields use.
function today(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// The message for a range that cannot be exported, or undefined when it can. Dates are
// YYYY-MM-DD strings, so comparing them as text is comparing them as dates.
function rangeProblems(from: string, to: string): { from?: string; to?: string } {
  const latest = today()
  const problems: { from?: string; to?: string } = {}
  if (from && from > latest) problems.from = 'Choose a start date that is not in the future.'
  if (to && to > latest) problems.to = 'Choose an end date that is not in the future.'
  if (from && to && from > to && !problems.from && !problems.to) {
    problems.to = 'The end date must be the same as or later than the start date.'
  }
  return problems
}

const FORMATS: { format: Format; title: string; text: string }[] = [
  {
    format: 'csv',
    title: 'CSV',
    text: 'A plain table you can open in a spreadsheet: the period and when it was made, the summary counts by decision, the risk band distribution and the number of items found of each type.',
  },
  {
    format: 'pdf',
    title: 'PDF',
    text: 'The same figures laid out as a document to read or file, with the active policy and AI model named, and a notice of what the screener does not do.',
  },
]

export function AdminReportsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exporting, setExporting] = useState<Format | null>(null)
  const [error, setError] = useState<string | null>(null)

  const problems = rangeProblems(from, to)
  const invalid = Boolean(problems.from || problems.to)

  const handleExport = async (format: Format) => {
    setError(null)
    setExporting(format)
    try {
      const params: Record<string, string> = { format }
      if (from) params.from = from
      if (to) params.to = to
      const response = await apiClient.get('/api/reports/export', { params, responseType: 'blob' })
      downloadBlob(response.data as Blob, `screening-report.${format}`)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Reports"
        description="Export the screening figures for a period. They are counts only: no prompt text and no per-user data."
      />

      {error && <PageMessage kind="error">{error}</PageMessage>}

      <div className="ps-stack">
        <section className="ps-card ps-stack">
          <h2 className="ps-card__title">Period</h2>
          <div className="report-dates">
            <div className="ps-field">
              <label className="ps-label" htmlFor="report-from">From</label>
              <input
                id="report-from"
                type="date"
                className="ps-input"
                value={from}
                max={today()}
                onChange={(e) => setFrom(e.target.value)}
                aria-invalid={problems.from ? true : undefined}
                aria-describedby={problems.from ? 'report-from-error' : undefined}
              />
              <FieldError id="report-from-error" message={problems.from} />
            </div>
            <div className="ps-field">
              <label className="ps-label" htmlFor="report-to">To</label>
              <input
                id="report-to"
                type="date"
                className="ps-input"
                value={to}
                max={today()}
                onChange={(e) => setTo(e.target.value)}
                aria-invalid={problems.to ? true : undefined}
                aria-describedby={problems.to ? 'report-to-error' : undefined}
              />
              <FieldError id="report-to-error" message={problems.to} />
            </div>
          </div>
          <p className="ps-help">Leave both empty for the last 7 days.</p>
        </section>

        <div className="ps-cards">
          {FORMATS.map((f) => (
            <section className="ps-card ps-stack" key={f.format}>
              <h2 className="ps-card__title">{f.title}</h2>
              <p className="ps-card__text">{f.text}</p>
              <div>
                <Button
                  variant="secondary"
                  disabled={invalid || exporting !== null}
                  loading={exporting === f.format}
                  onClick={() => handleExport(f.format)}
                >
                  {exporting === f.format ? 'Exporting…' : `Export ${f.title}`}
                </Button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
