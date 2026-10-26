import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiClient, extractErrorMessage } from '../api/client'
import { MaskedText } from '../components/MaskedText'
import { Button } from '../components/Button'
import { EntityChips, entityLabel } from '../components/EntityChips'
import { PageHeader } from '../components/PageHeader'
import { RiskScoreBar } from '../components/RiskScoreBar'
import { BreakdownPanel } from '../components/BreakdownPanel'
import { exampleTitle, PROMPT_EXAMPLES } from '../content/examples'
import { Icon, type IconName } from '../components/Icon'
import { PageMessage } from '../components/PageMessage'
import { FieldError } from '../components/FieldError'
import type { ScoreBreakdown } from '../api/types'

const MAX_LENGTH = 2000

// The title is "DECISION · what happened",
// so the result says what happened before the reader parses a score or a colour. Keyed on
// the decision string, never the score: a hard-overridden REVIEW at score 23 must read as
// REVIEW, and anything keyed on the score would call it safe.
const RESULT_OUTCOME: Record<string, string> = {
  ALLOW: 'Sent to the model',
  MASK: 'Sensitive data masked',
  CONFIRM: 'Your confirmation is needed',
  REVIEW: 'Held for a reviewer',
  BLOCK: 'Not sent anywhere',
}

const RESULT_ICON: Record<string, IconName> = {
  ALLOW: 'check',
  MASK: 'eye-slash',
  CONFIRM: 'question',
  REVIEW: 'eye',
  BLOCK: 'slashed-circle',
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
  scoreBreakdown: ScoreBreakdown | null
}

// Handles every result state: ALLOW, MASK/CONFIRM, BLOCK and REVIEW, with CONFIRM's own
// Cancel button, entity chips and the risk score bar.
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
      // on AI-gateway failure the backend leaves the prompt in its pending state -
      // keep `result` as-is so the masked preview + Confirm & Send button stay available
      // for a retry, instead of discarding the in-progress request.
      setError(extractErrorMessage(err))
    } finally {
      setConfirming(false)
    }
  }

  // CONFIRM's Cancel button. No backend "cancel" endpoint exists - the request just
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

  const tooLong = text.length > MAX_LENGTH
  const decisionKey = result?.decision?.toLowerCase() ?? ''
  const hasAlertStyle = result !== null && RESULT_ICON[result.decision] !== undefined

  return (
    <div className="page-content">
      <PageHeader
        title="Submit a prompt"
        description="Prompts are screened for sensitive data and injection risk before anything reaches the AI model."
      />

      {error && <PageMessage kind="error">{error}</PageMessage>}

      <div className="prompt-layout">
      <div className="ps-stack">
      <form className="ps-stack" onSubmit={handleSubmit}>
        <div className="ps-field">
          <div className="prompt-field-head">
            <label className="ps-label" htmlFor="prompt-input">Your prompt</label>
            <span className="ps-counter" aria-live="polite">{text.length} / {MAX_LENGTH}</span>
          </div>
          <textarea
            id="prompt-input"
            className="ps-textarea"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your prompt here…"
            aria-invalid={tooLong ? true : undefined}
            aria-describedby={tooLong ? 'prompt-error' : undefined}
          />
          <FieldError
            id="prompt-error"
            message={tooLong ? `Shorten your prompt to ${MAX_LENGTH} characters or fewer.` : undefined}
          />
        </div>

        {/* One click fills the box and nothing more: the prompt is only sent from the button below. */}
        <div className="ps-field">
          <span className="ps-label" id="prompt-examples-label">Try an example (synthetic)</span>
          <div className="ps-chips" role="group" aria-labelledby="prompt-examples-label">
            {PROMPT_EXAMPLES.map((example) => (
              <button
                key={example.id}
                type="button"
                className="ps-chip ps-chip--example"
                onClick={() => { setError(null); setText(example.text) }}
              >
                {exampleTitle(example)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Button type="submit" loading={submitting} disabled={text.trim().length < 3}>
            {submitting ? 'Screening…' : 'Screen & send'}
          </Button>
        </div>
      </form>

      {result && (
        <section className="prompt-result ps-stack" aria-label="Screening result">
          {/* The DecisionAlert: icon, DECISION · outcome, one or two sentences, and the
              actions when the user must act. role="alert" for CONFIRM and BLOCK, which
              need action; role="status" for the rest. Never animated or auto-dismissed. */}
          <div
            className={`ps-alert${hasAlertStyle ? ` ps-alert--${decisionKey}` : ''}`}
            role={result.decision === 'CONFIRM' || result.decision === 'BLOCK' ? 'alert' : 'status'}
          >
            {hasAlertStyle && <Icon name={RESULT_ICON[result.decision]} />}
            <p className="ps-alert__title">
              {result.decision} · {RESULT_OUTCOME[result.decision] ?? 'Screened'}
            </p>
            <div className="ps-alert__body ps-stack">
              {result.explanation && <p>{result.explanation}</p>}

              {/* the tracking ID, so a held prompt can be followed up. */}
              {pendingReview && (
                <p>Tracking ID: <span className="ps-mono">{result.requestId}</span></p>
              )}

              {/* CONFIRM's plain summary of what was found. */}
              {awaitingConfirm && result.decision === 'CONFIRM' && (
                <p>
                  {result.entityTypes.length > 0
                    ? `Found: ${result.entityTypes.map(entityLabel).join(', ')}. Check the masked version before sending.`
                    : 'This prompt needs your confirmation before it is sent.'}
                </p>
              )}

              {/* only the preview is conditional; the actions always render, so a
                  MASK/CONFIRM reached with nothing to mask can still be sent. */}
              {awaitingConfirm && (
                result.maskedText
                  ? (
                    <div className="ps-field">
                      <p className="ps-detail__k">Masked preview</p>
                      <MaskedText text={result.maskedText} />
                    </div>
                  )
                  : (
                    <p>
                      No masked preview: this prompt was held by its overall risk score rather than by a
                      specific piece of sensitive data, so there was nothing to mask. It will be sent to
                      the AI model exactly as you wrote it.
                    </p>
                  )
              )}
            </div>
            {awaitingConfirm && (
              <div className="ps-alert__actions">
                <Button loading={confirming} onClick={handleConfirm}>
                  {confirming ? 'Sending…' : 'Confirm & send'}
                </Button>
                {result.decision === 'CONFIRM' && (
                  <Button variant="secondary" onClick={handleCancel} disabled={confirming}>
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* the score, what was detected and how the score was made, for every decision. */}
          <div className="ps-card ps-stack">
            <RiskScoreBar score={result.riskScore} band={result.scoreBreakdown?.scoreBand} decision={result.decision} />
            {result.entityTypes.length > 0 && (
              <div className="ps-field">
                <p className="ps-detail__k">Detected items</p>
                <EntityChips entityTypes={result.entityTypes} />
              </div>
            )}
            <BreakdownPanel breakdown={result.scoreBreakdown} decision={result.decision} riskScore={result.riskScore} own />
          </div>

          {result.status === 'COMPLETED' && (
            <div className="ps-card">
              <p className="ps-card__title">AI response</p>
              <div className="ps-nested">{result.aiResponse}</div>
            </div>
          )}

          {result.status !== 'COMPLETED' && result.decision !== 'BLOCK' && !awaitingConfirm && !pendingReview && (
            <p className="ps-card__text">{result.explanation ?? `Status: ${result.status}`}</p>
          )}
        </section>
      )}
      </div>

      <aside className="ps-card prompt-aside" aria-label="About screening">
        <h2 className="ps-card__title">Before you send</h2>
        <p className="ps-card__text">
          Every prompt is checked on this machine before it can reach the AI model. Sensitive items are replaced by placeholders
          that name their type, and attempts to override the model are held for a reviewer or blocked.
        </p>
        <p className="ps-card__text">
          The score and its breakdown appear under the decision, so you can see why it came out that way.
        </p>
        <Link className="ps-link" to="/detectors">See what is detected</Link>
      </aside>
      </div>
    </div>
  )
}
