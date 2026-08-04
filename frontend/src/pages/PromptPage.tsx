import { useState, type FormEvent } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { MaskedText } from '../components/MaskedText'

const MAX_LENGTH = 2000

interface PromptResult {
  requestId: string
  status: string
  decision: string
  explanation: string | null
  maskedText: string | null
  aiResponse: string | null
}

// todo.md Phase 26. Handles the 3 decisions this phase names (ALLOW/MASK+CONFIRM/BLOCK).
// REVIEW isn't in scope here - Phase 27.1 adds its own alert box; until then it falls
// through to the generic "sent for review" case below the named ones.
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

  const awaitingConfirm = result !== null && result.status !== 'COMPLETED' && result.status !== 'BLOCKED'
    && (result.decision === 'MASK' || result.decision === 'CONFIRM')

  return (
    <div className="page-content">
      <h1>Submit a Prompt</h1>

      {error && <div className="banner banner-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <textarea
          className="prompt-textarea"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your prompt here…"
        />
        <div className={`char-counter${text.length > MAX_LENGTH ? ' char-counter-over' : ''}`}>
          {text.length} / {MAX_LENGTH}
        </div>

        <button type="submit" className="btn" disabled={submitting || text.trim().length < 3}>
          {submitting ? 'Screening…' : 'Submit'}
        </button>
      </form>

      {result && (
        <div className="results-section">
          {result.status === 'COMPLETED' && (
            <>
              <span className={`badge ${result.decision === 'ALLOW' ? 'badge-safe' : 'badge-neutral'}`}>
                {result.decision === 'ALLOW' ? 'Safe' : 'Sent'}
              </span>
              <div className="ai-response-box">{result.aiResponse}</div>
            </>
          )}

          {result.decision === 'BLOCK' && (
            <div className="alert-block">{result.explanation}</div>
          )}

          {awaitingConfirm && result.maskedText && (
            <>
              <p>{result.explanation}</p>
              <MaskedText text={result.maskedText} />
              <button type="button" className="btn" onClick={handleConfirm} disabled={confirming}>
                {confirming ? 'Sending…' : 'Confirm & Send'}
              </button>
            </>
          )}

          {result.status !== 'COMPLETED' && result.decision !== 'BLOCK' && !awaitingConfirm && (
            <p>{result.explanation ?? `Status: ${result.status}`}</p>
          )}
        </div>
      )}
    </div>
  )
}
