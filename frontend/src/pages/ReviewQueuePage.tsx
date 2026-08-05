import { Fragment, useEffect, useState } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { MaskedText } from '../components/MaskedText'
import { EntityChips } from '../components/EntityChips'
import { RiskScoreBar } from '../components/RiskScoreBar'

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
}

type ReviewAction = 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION' | 'FALSE_POSITIVE'

const ACTIONS: { value: ReviewAction; label: string; className: string }[] = [
  { value: 'APPROVE', label: 'Approve', className: 'btn' },
  { value: 'REJECT', label: 'Reject', className: 'btn btn-danger' },
  { value: 'REQUEST_CORRECTION', label: 'Request Correction', className: 'btn btn-secondary' },
  { value: 'FALSE_POSITIVE', label: 'Mark False Positive', className: 'btn btn-secondary' },
]

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
      <h1>Review Queue</h1>

      {error && <div className="banner banner-error">{error}</div>}
      {successMessage && <div className="banner banner-success">{successMessage}</div>}

      {loading && <p>Loading…</p>}

      {!loading && queue && queue.length === 0 && (
        <p>There are no prompts waiting for review.</p>
      )}

      {!loading && queue && queue.length > 0 && (
        <table className="history-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Risk Score</th>
              <th>Entity Types Found</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((item) => (
              <Fragment key={item.requestId}>
                <tr className="history-row" onClick={() => handleRowClick(item.requestId)}>
                  <td>{formatDateTime(item.submittedAt)}</td>
                  <td>{item.riskScore !== null ? Math.round(item.riskScore) : '—'}</td>
                  <td>{item.entityTypes.length > 0 ? <EntityChips entityTypes={item.entityTypes} /> : 'None'}</td>
                </tr>
                {expandedId === item.requestId && (
                  <tr className="history-detail-row">
                    <td colSpan={3}>
                      {detailLoadingId === item.requestId && <p>Loading details…</p>}
                      {detailError && detailLoadingId !== item.requestId && (
                        <div className="banner banner-error">{detailError}</div>
                      )}
                      {details[item.requestId] && (
                        <div className="history-detail">
                          <RiskScoreBar score={details[item.requestId].riskScore} />
                          {details[item.requestId].explanation && (
                            <p className="explanation-text">{details[item.requestId].explanation}</p>
                          )}
                          <MaskedText text={details[item.requestId].maskedPrompt} />
                          <EntityChips entityTypes={details[item.requestId].entityTypes} />

                          {details[item.requestId].matchedSignals.length > 0 && (
                            <div className="signal-chips">
                              {details[item.requestId].matchedSignals.map((signal) => (
                                <span key={signal} className="signal-chip">{signal}</span>
                              ))}
                            </div>
                          )}

                          <div className="form-field">
                            <label htmlFor="review-reason">Reason (required for any action)</label>
                            <input
                              id="review-reason"
                              type="text"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                              placeholder="Explain your decision…"
                            />
                          </div>

                          <div className="btn-row review-actions">
                            {ACTIONS.map((a) => (
                              <button
                                key={a.value}
                                type="button"
                                className={a.className}
                                disabled={!reason.trim() || decidingAction !== null}
                                onClick={() => handleDecide(item.requestId, a.value)}
                              >
                                {decidingAction === a.value ? 'Submitting…' : a.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
