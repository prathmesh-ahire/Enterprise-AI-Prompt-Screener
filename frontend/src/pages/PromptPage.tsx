import { useState, type FormEvent } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { MaskedText } from '../components/MaskedText'
import { Button } from '../components/Button'
import { EntityChips, entityLabel } from '../components/EntityChips'
import { PageHeader } from '../components/PageHeader'
import { RiskScoreBar } from '../components/RiskScoreBar'
import { decisionBadgeClass } from '../components/decisionBadge'

const MAX_LENGTH = 2000

// 47.2: one plain-English heading per decision band, so the result says what happened
// before the reader parses a score or a colour. Keyed on the decision string for the same
// reason decisionBadgeClass is (see that file): a hard-overridden REVIEW at score 23 must
// read as elevated, and anything keyed on the score would call it safe.
const RESULT_TITLE: Record<string, string> = {
  ALLOW: 'Allowed — sent to the model',
  MASK: 'Sensitive data found and masked',
  CONFIRM: 'Your confirmation needed',
  REVIEW: 'Sent for human review',
  BLOCK: 'Blocked — not sent anywhere',
}

interface PromptResult {
  requestId: string
  status: string
  decision: string
  explanation: string | null
  maskedText: string | null
  aiResponse: string | null
  riskScore: number | null
  entityTypes: string[]
}

// todo.md Phase 26 (ALLOW/MASK+CONFIRM/BLOCK) + Phase 27 (REVIEW, CONFIRM's own
// Cancel button, entity chips, risk score bar). REVIEW and CONFIRM used to share Phase
// 26's generic fallback / plain "Confirm & Send" - both are now fully specialised here.
export function PromptPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<PromptResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const response = await apiClient.post<PromptResult>('/api/prompts/submit', { text })
      setResult(response.data)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!result) return
    setError(null)
    setConfirming(true)
    try {
      const response = await apiClient.post<PromptResult>(`/api/prompts/${result.requestId}/confirm`)
      setResult(response.data)
    } catch (err) {
      // 13.8: on AI-gateway failure the backend leaves the prompt in its pending state -
      // keep `result` as-is so the masked preview + Confirm & Send button stay available
      // for a retry, instead of discarding the in-progress request.
      setError(extractErrorMessage(err))
    } finally {
      setConfirming(false)
    }
  }

  // 27.2: CONFIRM's Cancel button. No backend "cancel" endpoint exists - the request just
  // sits server-side in PENDING_CONFIRM until confirmed, so cancelling is purely a client-
  // side abandon: clear the result so the user can edit the text and resubmit if they want.
  const handleCancel = () => {
    setError(null)
    setResult(null)
  }

  const awaitingConfirm = result !== null && result.status !== 'COMPLETED' && result.status !== 'BLOCKED'
    && (result.decision === 'MASK' || result.decision === 'CONFIRM')
  const pendingReview = result !== null && result.decision === 'REVIEW'
    && result.status !== 'COMPLETED' && result.status !== 'BLOCKED'

  return (
    <div className="page-content">
      <PageHeader
        title="Submit a Prompt"
        description="Prompts are screened for sensitive data and injection risk before anything reaches the AI model."
      />

      {error && <div className="banner banner-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <label className="section-label" htmlFor="prompt-input" style={{ margin: '0 0 6px' }}>Your prompt</label>
          <div className={`char-counter${text.length > MAX_LENGTH ? ' char-counter-over' : ''}`}>
            {text.length} / {MAX_LENGTH}
          </div>
        </div>
        <textarea
          id="prompt-input"
          className="prompt-textarea"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your prompt here…"
        />

        <div className="btn-row" style={{ marginTop: 12 }}>
          <Button type="submit" loading={submitting} disabled={text.trim().length < 3}>
            {submitting ? 'Screening…' : 'Screen & send'}
          </Button>
        </div>
      </form>

      {result && (
        <div className="results-section">
          <div className={`result-card result-card-${(result.decision ?? '').toLowerCase()}`}>
            <div className="result-head">
              <span className={`badge ${decisionBadgeClass(result.decision)}`} style={{ marginBottom: 0 }}>
                {result.decision}
              </span>
              <span className="result-title">{RESULT_TITLE[result.decision] ?? 'Screened'}</span>
            </div>
          {result.status === 'COMPLETED' && (
            <>
              <p className="section-label">AI response</p>
              <div className="ai-response-box">{result.aiResponse}</div>
            </>
          )}

          {result.decision === 'BLOCK' && (
            <div className="alert-block">{result.explanation}</div>
          )}

          {/* 27.1: yellow "sent for review" alert, with the requestId for tracking. */}
          {pendingReview && (
            <div className="alert-review">
              <p>This prompt has been sent for human review.</p>
              <p className="request-id-line">Tracking ID: <span className="request-id">{result.requestId}</span></p>
            </div>
          )}

          {/* 27.3/27.4/27.5: score bar + explanation + entity chips, shown for every
              still-pending state (MASK/CONFIRM's preview below, or REVIEW's alert above). */}
          {(awaitingConfirm || pendingReview) && (
            <>
              <RiskScoreBar score={result.riskScore} />
              {result.explanation && <p className="explanation-text">{result.explanation}</p>}
              <EntityChips entityTypes={result.entityTypes} />
            </>
          )}

          {/* 41.4: this block used to be gated on `awaitingConfirm && result.maskedText`, so a
              MASK/CONFIRM decision reached with no detection finding to mask (by risk score
              alone, or by a hard override) rendered the backend's "review the masked version"
              explanation with no masked version shown and no Confirm button at all - a dead
              end the prompt could never leave. Only the preview is conditional now; the action
              row always renders, and 41.1 makes confirming actually work in that case. */}
          {awaitingConfirm && (
            <>
              {/* 27.2: CONFIRM gets its own plain-English summary line, on top of the
                  entity chips above - MASK keeps the plain Confirm & Send flow from 26.4. */}
              {result.decision === 'CONFIRM' && (
                <p className="summary-text">
                  {result.entityTypes.length > 0
                    ? `We found: ${result.entityTypes.map(entityLabel).join(', ')}. Review it below before sending.`
                    : 'This prompt needs your confirmation before it is sent.'}
                </p>
              )}
              {result.maskedText && <p className="section-label">Masked preview</p>}
              {result.maskedText
                ? <MaskedText text={result.maskedText} />
                : (
                  <p className="summary-text">
                    No masked preview: this prompt was held by its overall risk score rather than by a
                    specific piece of sensitive data, so there was nothing to mask. It will be sent to
                    the AI model exactly as you wrote it.
                  </p>
                )}
              <div className="btn-row" style={{ marginTop: 14 }}>
                <Button loading={confirming} onClick={handleConfirm}>
                  {confirming ? 'Sending…' : 'Confirm & Send'}
                </Button>
                {result.decision === 'CONFIRM' && (
                  <Button variant="secondary" onClick={handleCancel} disabled={confirming}>
                    Cancel
                  </Button>
                )}
              </div>
            </>
          )}

          {result.status !== 'COMPLETED' && result.decision !== 'BLOCK' && !awaitingConfirm && !pendingReview && (
            <p>{result.explanation ?? `Status: ${result.status}`}</p>
          )}
          </div>
        </div>
      )}
    </div>
  )
}
