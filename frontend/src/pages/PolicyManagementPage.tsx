import { useEffect, useState, type FormEvent } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { entityLabel } from '../components/EntityChips'
import { EmptyState, LoadingState } from '../components/DataState'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { PageMessage } from '../components/PageMessage'

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

  // One labelled number box; every policy and retention field has the same shape.
  const numberField = (id: string, label: string, value: NumberField, set: (v: NumberField) => void, min: number) => (
    <div className="ps-field">
      <label className="ps-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        className="ps-input"
        min={min}
        value={value}
        onChange={(e) => set(toNumberField(e.target.value))}
      />
    </div>
  )

  return (
    <div className="page-content">
      <PageHeader
        title="Policy"
        description="Thresholds, detectors and retention. Changes take effect on the very next prompt, with no restart."
      />

      <div className="ps-stack">
        <section className="ps-card">
          <div className="policy-card-head">
            <h2 className="ps-card__title">Screening policy</h2>
            {policy && <span className="ps-muted">Policy version <span className="ps-num">{policy.policyVersion}</span></span>}
          </div>

          {policyError && <PageMessage kind="error">{policyError}</PageMessage>}
          {policySuccess && <PageMessage kind="success">{policySuccess}</PageMessage>}
          {policyLoading && <LoadingState label="Loading policy…" />}

          {!policyLoading && (
            <div className="ps-stack">
              <div className="field-short">
                {numberField('max-prompt-length', 'Max prompt length (characters)', maxPromptLength, setMaxPromptLength, 1)}
              </div>

              <fieldset className="policy-fieldset">
                <legend className="ps-label">Detectors (clear a box to turn that detector off)</legend>
                <div className="ps-grid detector-grid">
                  {DETECTOR_TYPES.map((type) => (
                    <label key={type} className="ps-check">
                      <input
                        type="checkbox"
                        checked={!disabled.has(type)}
                        onChange={() => toggleDetector(type)}
                      />
                      {entityLabel(type)}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="ps-grid">
                {numberField('mask-threshold', 'Mask threshold', maskThreshold, setMaskThreshold, 0)}
                {numberField('confirm-threshold', 'Confirm threshold', confirmThreshold, setConfirmThreshold, 0)}
                {numberField('review-threshold', 'Review threshold', reviewThreshold, setReviewThreshold, 0)}
                {numberField('block-threshold', 'Block threshold', blockThreshold, setBlockThreshold, 0)}
              </div>

              <div className="ps-row">
                <Button loading={policySaving} onClick={handleSavePolicy}>
                  {policySaving ? 'Saving…' : 'Save policy'}
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="ps-card">
          <h2 className="ps-card__title">Confidential terms</h2>
          <p className="ps-card__text">A prompt containing any of these terms is flagged as a confidential term.</p>
          {termsError && <PageMessage kind="error">{termsError}</PageMessage>}

          {terms === null ? <LoadingState label="Loading terms…" /> : (
            <div className="ps-stack">
              {terms.length === 0 ? <EmptyState title="No confidential terms yet" hint="Add a term below to start flagging it." /> : (
                <div className="ps-table-wrap">
                  <table className="ps-table">
                    <thead>
                      <tr>
                        <th>Term</th>
                        <th><span className="ps-sr">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {terms.map((t) => (
                        <tr key={t.id} className="ps-tr">
                          <td>{t.term}</td>
                          <td className="ps-right">
                            <Button
                              variant="danger"
                              size="sm"
                              loading={deletingTermId === t.id}
                              onClick={() => handleDeleteTerm(t.id)}
                            >
                              {deletingTermId === t.id ? 'Removing…' : 'Remove'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <form className="add-form" onSubmit={handleAddTerm}>
                <div className="ps-field">
                  <label className="ps-label" htmlFor="new-term">New term</label>
                  <input
                    id="new-term"
                    type="text"
                    className="ps-input"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="secondary" loading={addingTerm} disabled={!newTerm.trim()}>
                  {addingTerm ? 'Adding…' : 'Add term'}
                </Button>
              </form>
            </div>
          )}
        </section>

        <section className="ps-card">
          <h2 className="ps-card__title">Data retention</h2>
          {retentionError && <PageMessage kind="error">{retentionError}</PageMessage>}
          {retentionSuccess && <PageMessage kind="success">{retentionSuccess}</PageMessage>}
          {retentionLoading ? <LoadingState label="Loading retention setting…" /> : (
            <div className="ps-stack">
              <div className="field-short">
                {numberField('retention-days', 'Retention period (days)', retentionDays, setRetentionDays, 1)}
              </div>
              <div className="ps-row">
                <Button variant="secondary" loading={retentionSaving} onClick={handleSaveRetention}>
                  {retentionSaving ? 'Saving…' : 'Save retention'}
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
