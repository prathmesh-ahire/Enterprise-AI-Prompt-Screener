import { useEffect, useState, type FormEvent } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { EmptyState, LoadingState } from '../components/DataState'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/Button'
import { PageMessage } from '../components/PageMessage'
import { ApprovedModelStatusPill, ModelStatusPill } from '../components/StatusPill'

interface ApprovedModel {
  id: number
  modelName: string
  active: boolean
  addedAt: string
}

interface OllamaStatus {
  reachable: boolean
}

interface AdminPolicy {
  policyVersion: number
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

// ADMIN only (enforced by RoleProtectedRoute in App.tsx).
export function ModelConfigPage() {
  const [models, setModels] = useState<ApprovedModel[] | null>(null)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [newModelName, setNewModelName] = useState('')
  const [addingModel, setAddingModel] = useState(false)
  const [togglingModelId, setTogglingModelId] = useState<number | null>(null)

  const [status, setStatus] = useState<OllamaStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [policyVersion, setPolicyVersion] = useState<number | null>(null)

  const loadModels = () => {
    apiClient.get<ApprovedModel[]>('/api/admin/approved-models')
      .then((response) => setModels(response.data))
      .catch((err) => setModelsError(extractErrorMessage(err)))
  }

  const loadStatus = () => {
    setStatusLoading(true)
    setStatusError(null)
    apiClient.get<OllamaStatus>('/api/admin/ollama-status')
      .then((response) => setStatus(response.data))
      .catch((err) => setStatusError(extractErrorMessage(err)))
      .finally(() => setStatusLoading(false))
  }

  useEffect(loadModels, [])
  useEffect(loadStatus, [])

  useEffect(() => {
    apiClient.get<AdminPolicy>('/api/admin/policy')
      .then((response) => setPolicyVersion(response.data.policyVersion))
      .catch(() => { /* shown elsewhere on Policy Management; not critical here */ })
  }, [])

  const handleAddModel = async (e: FormEvent) => {
    e.preventDefault()
    if (!newModelName.trim()) return
    setAddingModel(true)
    setModelsError(null)
    try {
      const response = await apiClient.post<ApprovedModel>('/api/admin/approved-models', { modelName: newModelName.trim() })
      setModels((prev) => (prev ? [...prev, response.data] : [response.data]))
      setNewModelName('')
    } catch (err) {
      setModelsError(extractErrorMessage(err))
    } finally {
      setAddingModel(false)
    }
  }

  // "Remove" deactivates rather than deletes - approved_models has no delete endpoint
  // (unlike org-confidential terms), so this reuses the same active-toggle PUT that
  // Activate uses.
  const handleToggleActive = async (model: ApprovedModel) => {
    setTogglingModelId(model.id)
    setModelsError(null)
    try {
      const response = await apiClient.put<ApprovedModel>(`/api/admin/approved-models/${model.id}`, { active: !model.active })
      setModels((prev) => prev
        ? prev.map((m) => (m.id === model.id ? response.data : m))
        : prev)
    } catch (err) {
      setModelsError(extractErrorMessage(err))
    } finally {
      setTogglingModelId(null)
    }
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Models"
        description="The local Ollama model this system forwards approved prompts to. Everything runs on this machine; no prompt leaves it."
      />

      <div className="ps-stack">
        <section className="ps-card">
          <h2 className="ps-card__title">Model status</h2>
          {statusError && <PageMessage kind="error">{statusError}</PageMessage>}
          {statusLoading ? <LoadingState label="Checking…" /> : (
            <div className="ps-row">
              <ModelStatusPill online={status?.reachable === true} />
              <Button variant="ghost" size="sm" onClick={loadStatus}>Refresh</Button>
            </div>
          )}
        </section>

        <section className="ps-card">
          <h2 className="ps-card__title">Policy and offline mode</h2>
          <div className="ps-metrics">
            <div className="ps-metric">
              <p className={`ps-metric__value${policyVersion === null ? ' ps-metric__value--empty' : ''}`}>
                {policyVersion ?? '—'}
              </p>
              <p className="ps-metric__label">Active policy version</p>
            </div>
            <div className="ps-metric">
              <p className="ps-metric__value">{status?.reachable ? 'Active' : 'Unavailable'}</p>
              <p className="ps-metric__label">Offline mode</p>
            </div>
          </div>
        </section>

        <section className="ps-card">
          <h2 className="ps-card__title">Approved models</h2>
          {modelsError && <PageMessage kind="error">{modelsError}</PageMessage>}

          {models === null ? <LoadingState label="Loading models…" /> : (
            <div className="ps-stack">
              {models.length === 0 ? <EmptyState title="No approved models yet" hint="Add a model name below." /> : (
                <div className="ps-table-wrap">
                  <table className="ps-table">
                    <thead>
                      <tr>
                        <th>Model name</th>
                        <th>Status</th>
                        <th>Added</th>
                        <th><span className="ps-sr">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {models.map((model) => (
                        <tr key={model.id} className="ps-tr">
                          <td className="ps-mono">{model.modelName}</td>
                          <td><ApprovedModelStatusPill active={model.active} /></td>
                          <td className="ps-muted">{formatDateTime(model.addedAt)}</td>
                          <td className="ps-right">
                            <Button
                              variant={model.active ? 'danger' : 'secondary'}
                              size="sm"
                              loading={togglingModelId === model.id}
                              onClick={() => handleToggleActive(model)}
                            >
                              {togglingModelId === model.id ? 'Working…' : model.active ? 'Remove' : 'Activate'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <form className="add-form" onSubmit={handleAddModel}>
                <div className="ps-field">
                  <label className="ps-label" htmlFor="new-model">New model name</label>
                  <input
                    id="new-model"
                    type="text"
                    className="ps-input"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                  />
                </div>
                <Button type="submit" loading={addingModel} disabled={!newModelName.trim()}>
                  {addingModel ? 'Adding…' : 'Add model'}
                </Button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
