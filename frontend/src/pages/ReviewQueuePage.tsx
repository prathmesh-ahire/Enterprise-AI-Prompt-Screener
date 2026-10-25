import { Fragment, useEffect, useState } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { MaskedText } from '../components/MaskedText'
import { EntityChips } from '../components/EntityChips'
import { EmptyState, LoadingState } from '../components/DataState'
import { PageHeader } from '../components/PageHeader'
import { RiskScoreBar } from '../components/RiskScoreBar'
import { Icon } from '../components/Icon'
import { PageMessage } from '../components/PageMessage'
import { Button } from '../components/Button'
import type { ScoreBreakdown } from '../api/types'

interface QueueItem {
  requestId: string
  userId: number
  submittedAt: string
  riskScore: number | null
  explanation: string | null
  entityTypes: string[]
}

interface ReviewDetails {
  requestId: string
  maskedPrompt: string
  entityTypes: string[]
  riskScore: number | null
  matchedSignals: string[]
  explanation: string | null
  scoreBreakdown: ScoreBreakdown | null
}

type ReviewAction = 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION' | 'FALSE_POSITIVE'

// Approve is the view's one primary action; Reject is a destructive reviewer action, so it
// takes the danger outline (it is not a BLOCK decision badge).
const ACTIONS: { value: ReviewAction; label: string; variant: 'primary' | 'secondary' | 'danger' }[] = [
  { value: 'APPROVE', label: 'Approve', variant: 'primary' },
  { value: 'REJECT', label: 'Reject', variant: 'danger' },
  { value: 'REQUEST_CORRECTION', label: 'Request correction', variant: 'secondary' },
  { value: 'FALSE_POSITIVE', label: 'Mark as false positive', variant: 'secondary' },
]

// Sentence case for the risk-signal names (INSTRUCTION_OVERRIDE -> "Instruction override").
function signalLabel(signal: string): string {
  const words = signal.toLowerCase().replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

// todo.md Phase 29. REVIEWER/ADMIN only (enforced by RoleProtectedRoute in App.tsx).
export function ReviewQueuePage() {
  const [queue, setQueue] = useState<QueueItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, ReviewDetails>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [reason, setReason] = useState('')
  const [decidingAction, setDecidingAction] = useState<ReviewAction | null>(null)

  const loadQueue = () => {
    setLoading(true)
    setError(null)
    apiClient.get<QueueItem[]>('/api/review/queue')
      .then((response) => setQueue(response.data))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(loadQueue, [])

  const handleRowClick = async (requestId: string) => {
    setSuccessMessage(null)
    if (expandedId === requestId) {
      setExpandedId(null)
      return
    }
    setExpandedId(requestId)
    setReason('')
    if (details[requestId]) return

    setDetailError(null)
    setDetailLoadingId(requestId)
    try {
      const response = await apiClient.get<ReviewDetails>(`/api/review/${requestId}/details`)
      setDetails((prev) => ({ ...prev, [requestId]: response.data }))
    } catch (err) {
      setDetailError(extractErrorMessage(err))
    } finally {
      setDetailLoadingId(null)
    }
  }

  const handleDecide = async (requestId: string, action: ReviewAction) => {
    if (!reason.trim()) return
    setError(null)
    setDecidingAction(action)
    try {
      await apiClient.post(`/api/review/${requestId}/decide`, { action, reason })
      setSuccessMessage(`${ACTIONS.find((a) => a.value === action)?.label} recorded for this prompt.`)
      setQueue((prev) => (prev ? prev.filter((item) => item.requestId !== requestId) : prev))
      setExpandedId(null)
      setReason('')
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setDecidingAction(null)
    }
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Review queue"
        description="Prompts held for human review. Each shows its masked text and what was detected; the raw prompt is never displayed."
      />

      {error && <PageMessage kind="error">{error}</PageMessage>}
      {successMessage && <PageMessage kind="success">{successMessage}</PageMessage>}

      {loading && <LoadingState label="Loading the review queue…" />}

      {!loading && queue && queue.length === 0 && (
        <EmptyState
          title="Nothing waiting for review"
          hint="Prompts arrive here when they score in the REVIEW band or trip a hard override."
        />
      )}

      {!loading && queue && queue.length > 0 && (
        <div className="ps-table-wrap">
          <table className="ps-table">
            <caption>Prompts waiting for a reviewer, oldest first.</caption>
            <thead>
              <tr>
                <th className="col-expander"><span className="ps-sr">Details</span></th>
                <th>Time</th>
                <th className="ps-right">Risk score</th>
                <th>Detected items</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((item) => {
                const open = expandedId === item.requestId
                const detailId = `review-detail-${item.requestId}`
                const detail = details[item.requestId]
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
                      <td>
                        {item.entityTypes.length > 0
                          ? <EntityChips entityTypes={item.entityTypes} />
                          : <span className="ps-muted">None</span>}
                      </td>
                    </tr>
                    {open && (
                      <tr className="ps-detail" id={detailId}>
                        <td colSpan={4}>
                          {detailLoadingId === item.requestId && <LoadingState label="Loading details…" />}
                          {detailError && detailLoadingId !== item.requestId && (
                            <PageMessage kind="error">{detailError}</PageMessage>
                          )}
                          {detail && (
                            <div className="ps-stack">
                              {/* Everything in this queue was decided REVIEW, which is the F1 fallback colour. */}
                              <RiskScoreBar
                                score={detail.riskScore}
                                band={detail.scoreBreakdown?.scoreBand}
                                decision="REVIEW"
                              />
                              {detail.explanation && <p>{detail.explanation}</p>}
                              <div className="ps-detail__grid">
                                <div>
                                  <p className="ps-detail__k">Masked prompt</p>
                                  <MaskedText text={detail.maskedPrompt} />
                                </div>
                                {detail.entityTypes.length > 0 && (
                                  <div>
                                    <p className="ps-detail__k">Detected items</p>
                                    <EntityChips entityTypes={detail.entityTypes} />
                                  </div>
                                )}
                                {detail.matchedSignals.length > 0 && (
                                  <div>
                                    <p className="ps-detail__k">Matched signals</p>
                                    {/* Neutral, pill-shaped and not interactive (design.md 15b). */}
                                    <div className="ps-chips">
                                      {detail.matchedSignals.map((signal) => (
                                        <span key={signal} className="ps-chip ps-chip--signal">{signalLabel(signal)}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="ps-field review-reason">
                                <label className="ps-label" htmlFor="review-reason">Reason for your decision</label>
                                <input
                                  id="review-reason"
                                  type="text"
                                  className="ps-input"
                                  value={reason}
                                  onChange={(e) => setReason(e.target.value)}
                                  placeholder="Explain your decision…"
                                  aria-describedby="review-reason-help"
                                />
                                {/* 47.4: the four actions stay disabled until a reason is typed,
                                    and this line says so - four greyed-out buttons with no
                                    explanation read as "you lack permission". */}
                                <p id="review-reason-help" className="ps-help">
                                  {reason.trim()
                                    ? 'Choose an action below.'
                                    : 'Enter a reason to enable the four actions below.'}
                                </p>
                              </div>
                              <div className="ps-row">
                                {ACTIONS.map((a) => (
                                  <Button
                                    key={a.value}
                                    variant={a.variant}
                                    disabled={!reason.trim() || decidingAction !== null}
                                    loading={decidingAction === a.value}
                                    onClick={() => handleDecide(item.requestId, a.value)}
                                  >
                                    {decidingAction === a.value ? 'Submitting…' : a.label}
                                  </Button>
                                ))}
                              </div>
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
      )}
    </div>
  )
}
