import { Fragment, useEffect, useState } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { MaskedText } from '../components/MaskedText'
import { EntityChips } from '../components/EntityChips'
import { EmptyState, LoadingState } from '../components/DataState'
import { PageHeader } from '../components/PageHeader'
import { DecisionBadge } from '../components/DecisionBadge'
import { PromptStatusPill } from '../components/StatusPill'
import { Icon } from '../components/Icon'
import { PageMessage } from '../components/PageMessage'
import { Pagination } from '../components/Pagination'
import { Button } from '../components/Button'
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
  { value: 'ALLOW', label: 'ALLOW' },
  { value: 'MASK', label: 'MASK' },
  { value: 'CONFIRM', label: 'CONFIRM' },
  { value: 'REVIEW', label: 'REVIEW' },
  { value: 'BLOCK', label: 'BLOCK' },
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
      <PageHeader
        title="Prompt history"
        description="Every prompt you have submitted, with the decision it received and why."
      />

      {error && <PageMessage kind="error">{error}</PageMessage>}

      {/* "No history at all" — distinct from "no rows match the filter" below. */}
      {!loading && pageData && pageData.totalElements === 0 && (
        <EmptyState
          title="No prompts yet"
          hint="Submit one from the Prompt page and it will appear here with its decision."
        />
      )}

      {(loading || (pageData && pageData.totalElements > 0)) && (
        <div className="ps-stack">
          <div className="ps-field table-filter">
            <label className="ps-label" htmlFor="decision-filter">Filter by decision</label>
            <select id="decision-filter" className="ps-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {DECISION_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <LoadingState label="Loading your history…" />
          ) : (
            <>
              <div className="ps-table-wrap">
                <table className="ps-table">
                  <caption>Your prompts, newest first. The filter applies to this page.</caption>
                  <thead>
                    <tr>
                      <th className="col-expander"><span className="ps-sr">Details</span></th>
                      <th>Date and time</th>
                      <th className="ps-right">Risk score</th>
                      <th>Decision</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const open = expandedId === item.requestId
                      const detailId = `history-detail-${item.requestId}`
                      return (
                        <Fragment key={item.requestId}>
                          <tr className="ps-tr row-clickable" onClick={() => handleRowClick(item.requestId)}>
                            <td>
                              <button
                                type="button"
                                className="ps-expander"
                                aria-expanded={open}
                                aria-controls={open ? detailId : undefined}
                                aria-label={`${open ? 'Hide' : 'Show'} details for the prompt from ${formatDateTime(item.submittedAt)}`}
                                onClick={(e) => { e.stopPropagation(); handleRowClick(item.requestId) }}
                              >
                                <Icon name="chevron" />
                              </button>
                            </td>
                            <td className="ps-muted">{formatDateTime(item.submittedAt)}</td>
                            <td className="ps-num">{item.riskScore !== null ? Math.round(item.riskScore) : '—'}</td>
                            <td>{item.decision ? <DecisionBadge decision={item.decision} /> : '—'}</td>
                            <td><PromptStatusPill status={item.status} /></td>
                          </tr>
                          {open && (
                            <tr className="ps-detail" id={detailId}>
                              <td colSpan={5}>
                                {detailLoadingId === item.requestId && <LoadingState label="Loading details…" />}
                                {detailError && detailLoadingId !== item.requestId && (
                                  <PageMessage kind="error">{detailError}</PageMessage>
                                )}
                                {details[item.requestId] && (
                                  <div className="ps-detail__grid">
                                    <div>
                                      <p className="ps-detail__k">Sent as</p>
                                      {details[item.requestId].maskedText
                                        ? <MaskedText text={details[item.requestId].maskedText!} />
                                        : <p className="ps-card__text">No sensitive data was found in this prompt.</p>}
                                    </div>
                                    {details[item.requestId].entityTypes.length > 0 && (
                                      <div>
                                        <p className="ps-detail__k">Detected items</p>
                                        <EntityChips entityTypes={details[item.requestId].entityTypes} />
                                      </div>
                                    )}
                                    {details[item.requestId].explanation && (
                                      <div>
                                        <p className="ps-detail__k">Why</p>
                                        <p>{details[item.requestId].explanation}</p>
                                      </div>
                                    )}
                                    {details[item.requestId].aiResponse && (
                                      <div>
                                        <p className="ps-detail__k">AI response</p>
                                        <div className="ps-nested">{details[item.requestId].aiResponse}</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Filter matched nothing — the user DOES have history, so this must not
                  say the same thing as the empty state above. */}
              {filteredItems.length === 0 && (
                <EmptyState
                  title="Nothing matches this filter on this page"
                  hint="Choose a different decision, or move to another page."
                  action={<Button variant="secondary" onClick={() => setFilter('ALL')}>Clear the filter</Button>}
                />
              )}

              <Pagination
                page={pageData?.number ?? 0}
                totalPages={pageData?.totalPages ?? 1}
                first={!pageData || pageData.first}
                last={!pageData || pageData.last}
                onPrevious={() => setPage((p) => p - 1)}
                onNext={() => setPage((p) => p + 1)}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
