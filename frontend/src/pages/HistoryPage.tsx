import { Fragment, useEffect, useState } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { MaskedText } from '../components/MaskedText'
import { EntityChips } from '../components/EntityChips'
import { decisionBadgeClass } from '../components/decisionBadge'
import type { PageResponse } from '../api/types'

const PAGE_SIZE = 10

interface HistoryItem {
  requestId: string
  submittedAt: string
  status: string
  decision: string | null
  riskScore: number | null
  explanation: string | null
  maskedText: string | null
}

interface PromptDetail {
  requestId: string
  status: string
  decision: string
  explanation: string | null
  maskedText: string | null
  aiResponse: string | null
  riskScore: number | null
  entityTypes: string[]
}

// 28.4's filter is by *decision*, not the literal `status` values todo.md named
// (ALLOWED/MASKED/BLOCKED/PENDING_REVIEW). Once a prompt actually gets an AI reply its
// `status` moves on to COMPLETED (PromptService.sendToAiAndComplete) - so filtering on
// `status` would hide the common case entirely. `decision` is set once and never changes
// (same reasoning DashboardService's Phase 21.1 summary already documented for exactly
// this problem) - see docs/NOTE.md.
const DECISION_FILTERS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ALLOW', label: 'Allowed' },
  { value: 'MASK', label: 'Masked' },
  { value: 'CONFIRM', label: 'Awaiting Confirmation' },
  { value: 'REVIEW', label: 'Pending Review' },
  { value: 'BLOCK', label: 'Blocked' },
]

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function HistoryPage() {
  const [page, setPage] = useState(0)
  const [pageData, setPageData] = useState<PageResponse<HistoryItem> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('ALL')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, PromptDetail>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiClient.get<PageResponse<HistoryItem>>('/api/prompts/my-history', { params: { page, size: PAGE_SIZE } })
      .then((response) => {
        if (!cancelled) setPageData(response.data)
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [page])

  const handleRowClick = async (requestId: string) => {
    if (expandedId === requestId) {
      setExpandedId(null)
      return
    }
    setExpandedId(requestId)
    if (details[requestId]) return

    setDetailError(null)
    setDetailLoadingId(requestId)
    try {
      const response = await apiClient.get<PromptDetail>(`/api/prompts/${requestId}`)
      setDetails((prev) => ({ ...prev, [requestId]: response.data }))
    } catch (err) {
      setDetailError(extractErrorMessage(err))
    } finally {
      setDetailLoadingId(null)
    }
  }

  const items = pageData?.content ?? []
  const filteredItems = filter === 'ALL' ? items : items.filter((item) => item.decision === filter)

  return (
    <div className="page-content">
      <h1>Prompt History</h1>

      {error && <div className="banner banner-error">{error}</div>}

      {!loading && pageData && pageData.totalElements === 0 && (
        <p>You haven't submitted any prompts yet.</p>
      )}

      {(loading || (pageData && pageData.totalElements > 0)) && (
        <>
          <div className="form-field history-filter">
            <label htmlFor="decision-filter">Filter by decision</label>
            <select id="decision-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {DECISION_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p>Loading…</p>
          ) : (
            <>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Risk Score</th>
                    <th>Decision</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <Fragment key={item.requestId}>
                      <tr className="history-row" onClick={() => handleRowClick(item.requestId)}>
                        <td>{formatDateTime(item.submittedAt)}</td>
                        <td>{item.riskScore !== null ? Math.round(item.riskScore) : '—'}</td>
                        <td>
                          {item.decision
                            ? <span className={`badge ${decisionBadgeClass(item.decision)}`}>{item.decision}</span>
                            : '—'}
                        </td>
                        <td>{item.status}</td>
                      </tr>
                      {expandedId === item.requestId && (
                        <tr className="history-detail-row">
                          <td colSpan={4}>
                            {detailLoadingId === item.requestId && <p>Loading details…</p>}
                            {detailError && detailLoadingId !== item.requestId && (
                              <div className="banner banner-error">{detailError}</div>
                            )}
                            {details[item.requestId] && (
                              <div className="history-detail">
                                {details[item.requestId].maskedText
                                  ? <MaskedText text={details[item.requestId].maskedText!} />
                                  : <p>No sensitive data was found in this prompt.</p>}
                                <EntityChips entityTypes={details[item.requestId].entityTypes} />
                                {details[item.requestId].explanation && (
                                  <p className="explanation-text">{details[item.requestId].explanation}</p>
                                )}
                                {details[item.requestId].aiResponse && (
                                  <div className="ai-response-box">{details[item.requestId].aiResponse}</div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>

              {filteredItems.length === 0 && (
                <p>No records match this filter on this page.</p>
              )}

              <div className="pagination">
                <button type="button" className="btn btn-secondary" onClick={() => setPage((p) => p - 1)} disabled={!pageData || pageData.first}>
                  Previous
                </button>
                <span className="pagination-label">
                  Page {(pageData?.number ?? 0) + 1} of {Math.max(pageData?.totalPages ?? 1, 1)}
                </span>
                <button type="button" className="btn btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={!pageData || pageData.last}>
                  Next
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
