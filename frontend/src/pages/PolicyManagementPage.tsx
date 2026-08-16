import { useEffect, useState, type FormEvent } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { entityLabel } from '../components/EntityChips'
import { EmptyState, LoadingState } from '../components/DataState'
import { PageHeader } from '../components/PageHeader'

// Same 9 EntityType values DetectionEngine (backend Phase 9.6) checks against
// disabled_detectors - reusing EntityChips' key list keeps this in one place.
const DETECTOR_TYPES = [
  'PERSONAL_EMAIL', 'PHONE_NUMBER', 'PAN_LIKE_ID', 'AADHAAR_LIKE_ID', 'PAYMENT_CARD',
  'API_KEY', 'PASSWORD_SECRET', 'PRIVATE_KEY', 'ORG_CONFIDENTIAL',
]

interface AdminPolicy {
  maxPromptLength: number
  disabledDetectors: string[]
  maskThreshold: number
  confirmThreshold: number
  reviewThreshold: number
  blockThreshold: number
  policyVersion: number
}

interface OrgTerm {
  id: number
  term: string
  addedBy: number | null
  active: boolean
}

interface Retention {
  retentionDays: number
}

// 41.8: an empty <input type="number"> reports value '', and Number('') is 0 - so binding
// these fields straight through `setX(Number(e.target.value))` wrote a 0 straight back into
// the box the instant it was cleared, and whatever the admin typed next was appended to that
// stray zero ("25" came out as "025"). Holding '' as a distinct state lets the field actually
// be empty while it is being retyped; blanks are caught and reported at save time instead.
type NumberField = number | ''

const toNumberField = (raw: string): NumberField => (raw === '' ? '' : Number(raw))

// Returns the labels of any fields left blank, so the message can name them.
const blankFields = (fields: Record<string, NumberField>): string[] =>
  Object.entries(fields).filter(([, value]) => value === '').map(([label]) => label)

// todo.md Phase 31. ADMIN only (enforced by RoleProtectedRoute in App.tsx).
export function PolicyManagementPage() {
  const [policy, setPolicy] = useState<AdminPolicy | null>(null)
  const [disabled, setDisabled] = useState<Set<string>>(new Set())
  const [maxPromptLength, setMaxPromptLength] = useState<NumberField>(2000)
  const [maskThreshold, setMaskThreshold] = useState<NumberField>(25)
  const [confirmThreshold, setConfirmThreshold] = useState<NumberField>(50)
  const [reviewThreshold, setReviewThreshold] = useState<NumberField>(65)
  const [blockThreshold, setBlockThreshold] = useState<NumberField>(75)
  const [policyLoading, setPolicyLoading] = useState(true)
  const [policyError, setPolicyError] = useState<string | null>(null)
  const [policySaving, setPolicySaving] = useState(false)
  const [policySuccess, setPolicySuccess] = useState<string | null>(null)

  const [terms, setTerms] = useState<OrgTerm[] | null>(null)
  const [termsError, setTermsError] = useState<string | null>(null)
  const [newTerm, setNewTerm] = useState('')
  const [addingTerm, setAddingTerm] = useState(false)
  const [deletingTermId, setDeletingTermId] = useState<number | null>(null)

  const [retentionDays, setRetentionDays] = useState<NumberField>(90)
  const [retentionLoading, setRetentionLoading] = useState(true)
  const [retentionError, setRetentionError] = useState<string | null>(null)
  const [retentionSaving, setRetentionSaving] = useState(false)
  const [retentionSuccess, setRetentionSuccess] = useState<string | null>(null)

  const applyPolicy = (data: AdminPolicy) => {
    setPolicy(data)
    setDisabled(new Set(data.disabledDetectors))
    setMaxPromptLength(data.maxPromptLength)
    setMaskThreshold(data.maskThreshold)
    setConfirmThreshold(data.confirmThreshold)
    setReviewThreshold(data.reviewThreshold)
    setBlockThreshold(data.blockThreshold)
  }

  useEffect(() => {
    let cancelled = false
    setPolicyLoading(true)
    apiClient.get<AdminPolicy>('/api/admin/policy')
      .then((response) => { if (!cancelled) applyPolicy(response.data) })
      .catch((err) => { if (!cancelled) setPolicyError(extractErrorMessage(err)) })
      .finally(() => { if (!cancelled) setPolicyLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    apiClient.get<OrgTerm[]>('/api/admin/org-terms')
      .then((response) => { if (!cancelled) setTerms(response.data) })
      .catch((err) => { if (!cancelled) setTermsError(extractErrorMessage(err)) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setRetentionLoading(true)
    apiClient.get<Retention>('/api/admin/retention')
      .then((response) => { if (!cancelled) setRetentionDays(response.data.retentionDays) })
      .catch((err) => { if (!cancelled) setRetentionError(extractErrorMessage(err)) })
      .finally(() => { if (!cancelled) setRetentionLoading(false) })
    return () => { cancelled = true }
  }, [])

  const toggleDetector = (type: string) => {
    setDisabled((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const handleSavePolicy = async () => {
    setPolicyError(null)
    setPolicySuccess(null)

    // 41.8: reconcile the possibly-empty fields back to numbers before sending. Refusing the
    // save with a message that names the empty boxes is better than silently submitting a 0,
    // which the backend's ascending-threshold validation would reject with a vaguer error.
    const blank = blankFields({
      'Max prompt length': maxPromptLength,
      'Mask threshold': maskThreshold,
      'Confirm threshold': confirmThreshold,
      'Review threshold': reviewThreshold,
      'Block threshold': blockThreshold,
    })
    if (blank.length > 0) {
      setPolicyError(`Please enter a value for: ${blank.join(', ')}.`)
      return
    }

    setPolicySaving(true)
    try {
      const response = await apiClient.put<AdminPolicy>('/api/admin/policy', {
        maxPromptLength,
        disabledDetectors: Array.from(disabled),
        maskThreshold,
        confirmThreshold,
        reviewThreshold,
        blockThreshold,
      })
      applyPolicy(response.data)
      setPolicySuccess(`Policy saved. New policy version: ${response.data.policyVersion}`)
    } catch (err) {
      setPolicyError(extractErrorMessage(err))
    } finally {
      setPolicySaving(false)
    }
  }

  const handleAddTerm = async (e: FormEvent) => {
    e.preventDefault()
    if (!newTerm.trim()) return
    setAddingTerm(true)
    setTermsError(null)
    try {
      const response = await apiClient.post<OrgTerm>('/api/admin/org-terms', { term: newTerm.trim() })
      setTerms((prev) => (prev ? [...prev, response.data] : [response.data]))
      setNewTerm('')
    } catch (err) {
      setTermsError(extractErrorMessage(err))
    } finally {
      setAddingTerm(false)
    }
  }

  const handleDeleteTerm = async (id: number) => {
    setDeletingTermId(id)
    setTermsError(null)
    try {
      await apiClient.delete(`/api/admin/org-terms/${id}`)
      setTerms((prev) => (prev ? prev.filter((t) => t.id !== id) : prev))
    } catch (err) {
      setTermsError(extractErrorMessage(err))
    } finally {
      setDeletingTermId(null)
    }
  }

  const handleSaveRetention = async () => {
    setRetentionError(null)
    setRetentionSuccess(null)

    if (retentionDays === '') {
      setRetentionError('Please enter a retention period in days.')
      return
    }

    setRetentionSaving(true)
    try {
      const response = await apiClient.put<Retention>('/api/admin/retention', { retentionDays })
      setRetentionDays(response.data.retentionDays)
      setRetentionSuccess('Retention setting saved.')
    } catch (err) {
      setRetentionError(extractErrorMessage(err))
    } finally {
      setRetentionSaving(false)
    }
  }

  return (
    <div className="page-content page-content-wide">
      <PageHeader
        title="Policy Management"
        description="Thresholds, detectors and retention. Changes take effect on the very next prompt — no restart needed."
      />

      <section className="admin-section">
        <h2>
          Screening Policy{' '}
          {policy && <span className="badge badge-neutral">v{policy.policyVersion}</span>}
        </h2>

        {policyError && <div className="banner banner-error">{policyError}</div>}
        {policySuccess && <div className="banner banner-success">{policySuccess}</div>}
        {policyLoading && <LoadingState label="Loading policy…" />}

        {!policyLoading && (
          <>
            <div className="form-field">
              <label htmlFor="max-prompt-length">Max prompt length (characters)</label>
              <input
                id="max-prompt-length"
                type="number"
                min={1}
                value={maxPromptLength}
                onChange={(e) => setMaxPromptLength(toNumberField(e.target.value))}
              />
            </div>

            <div className="form-field">
              <label>Detectors (unchecking disables that detector)</label>
              <div className="detector-toggle-list">
                {DETECTOR_TYPES.map((type) => (
                  <label key={type} className="detector-toggle">
                    <input
                      type="checkbox"
                      checked={!disabled.has(type)}
                      onChange={() => toggleDetector(type)}
                    />
                    {entityLabel(type)}
                  </label>
                ))}
              </div>
            </div>

            <div className="threshold-grid">
              <div className="form-field">
                <label htmlFor="mask-threshold">Mask threshold</label>
                <input
                  id="mask-threshold"
                  type="number"
                  min={0}
                  value={maskThreshold}
                  onChange={(e) => setMaskThreshold(toNumberField(e.target.value))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="confirm-threshold">Confirm threshold</label>
                <input
                  id="confirm-threshold"
                  type="number"
                  min={0}
                  value={confirmThreshold}
                  onChange={(e) => setConfirmThreshold(toNumberField(e.target.value))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="review-threshold">Review threshold</label>
                <input
                  id="review-threshold"
                  type="number"
                  min={0}
                  value={reviewThreshold}
                  onChange={(e) => setReviewThreshold(toNumberField(e.target.value))}
                />
              </div>
              <div className="form-field">
                <label htmlFor="block-threshold">Block threshold</label>
                <input
                  id="block-threshold"
                  type="number"
                  min={0}
                  value={blockThreshold}
                  onChange={(e) => setBlockThreshold(toNumberField(e.target.value))}
                />
              </div>
            </div>

            <button type="button" className="btn" disabled={policySaving} onClick={handleSavePolicy}>
              {policySaving ? 'Saving…' : 'Save Policy'}
            </button>
          </>
        )}
      </section>

      <section className="admin-section">
        <h2>Organisation Confidential Terms</h2>
        {termsError && <div className="banner banner-error">{termsError}</div>}

        {terms === null ? <LoadingState label="Loading terms…" /> : (
          <>
            {terms.length === 0 ? <EmptyState title="No confidential terms configured yet." hint="Add a term below and any prompt containing it is flagged as ORG_CONFIDENTIAL." /> : (
              <ul className="term-list">
                {terms.map((t) => (
                  <li key={t.id} className="term-list-item">
                    <span>{t.term}</span>
                    <button
                      type="button"
                      className="btn-link"
                      disabled={deletingTermId === t.id}
                      onClick={() => handleDeleteTerm(t.id)}
                    >
                      {deletingTermId === t.id ? 'Removing…' : 'Remove'}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form className="term-add-form" onSubmit={handleAddTerm}>
              <input
                type="text"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="New confidential term…"
              />
              <button type="submit" className="btn btn-secondary" disabled={addingTerm || !newTerm.trim()}>
                {addingTerm ? 'Adding…' : 'Add'}
              </button>
            </form>
          </>
        )}
      </section>

      <section className="admin-section">
        <h2>Data Retention</h2>
        {retentionError && <div className="banner banner-error">{retentionError}</div>}
        {retentionSuccess && <div className="banner banner-success">{retentionSuccess}</div>}
        {retentionLoading ? <LoadingState label="Loading retention setting…" /> : (
          <>
            <div className="form-field">
              <label htmlFor="retention-days">Retention period (days)</label>
              <input
                id="retention-days"
                type="number"
                min={1}
                value={retentionDays}
                onChange={(e) => setRetentionDays(toNumberField(e.target.value))}
              />
            </div>
            <button type="button" className="btn" disabled={retentionSaving} onClick={handleSaveRetention}>
              {retentionSaving ? 'Saving…' : 'Save Retention'}
            </button>
          </>
        )}
      </section>
    </div>
  )
}
