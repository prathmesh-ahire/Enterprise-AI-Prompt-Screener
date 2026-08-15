import { useEffect, useState, type FormEvent } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { EmptyState, LoadingState } from '../components/DataState'
import { PageHeader } from '../components/PageHeader'

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

// todo.md Phase 32. ADMIN only (enforced by RoleProtectedRoute in App.tsx).
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
  // Activate uses. See docs/NOTE.md, Phase 32.
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
    <div className="page-content page-content-wide">
      <PageHeader
        title="Model Configuration"
        description="The local Ollama model this system forwards approved prompts to. Everything runs on this machine — no prompt ever leaves it."
      />

      <section className="admin-section">
        <h2>Model Status</h2>
        {statusError && <div className="banner banner-error">{statusError}</div>}
        {statusLoading ? <LoadingState label="Checking…" /> : (
          <div className="model-status-row">
            <span className={`badge ${status?.reachable ? 'badge-safe' : 'badge-band-red'}`}>
              {status?.reachable ? 'Online' : 'Unavailable'}
            </span>
            <button type="button" className="btn-link" onClick={loadStatus}>Refresh</button>
          </div>
        )}
      </section>

      <section className="admin-section">
        <h2>Policy &amp; Offline Mode</h2>
        <div className="stat-cards">
          <div className="stat-card">
            <div className="stat-card-value">{policyVersion !== null ? `v${policyVersion}` : '—'}</div>
            <div className="stat-card-label">Active Policy Version</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">{status?.reachable ? 'Active' : 'Unavailable'}</div>
            <div className="stat-card-label">Offline Mode</div>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <h2>Approved Models</h2>
        {modelsError && <div className="banner banner-error">{modelsError}</div>}

        {models === null ? <LoadingState label="Loading models…" /> : (
          <>
            {models.length === 0 ? <EmptyState title="No approved models configured yet." /> : (
              <div className="table-scroll">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Model Name</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((model) => (
                    <tr key={model.id}>
                      <td>{model.modelName}</td>
                      <td>
                        <span className={`badge ${model.active ? 'badge-safe' : 'badge-neutral'}`}>
                          {model.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatDateTime(model.addedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className={model.active ? 'btn btn-danger' : 'btn btn-secondary'}
                          disabled={togglingModelId === model.id}
                          onClick={() => handleToggleActive(model)}
                        >
                          {togglingModelId === model.id ? 'Working…' : model.active ? 'Remove' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}

            <form className="term-add-form" onSubmit={handleAddModel}>
              <input
                type="text"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="New model name (e.g. llama3.2)…"
              />
              <button type="submit" className="btn btn-secondary" disabled={addingModel || !newModelName.trim()}>
                {addingModel ? 'Adding…' : 'Add'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
