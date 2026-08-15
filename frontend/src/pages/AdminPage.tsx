import { Fragment, useEffect, useState } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { EmptyState, LoadingState } from '../components/DataState'
import { PageHeader } from '../components/PageHeader'
import { EntityBreakdownChart, ProcessingTimePanel, RiskBandDonut, type RiskBandStat } from '../components/DashboardCharts'
import { decisionBadgeClass } from '../components/decisionBadge'
import type { PageResponse } from '../api/types'

const USERS_PAGE_SIZE = 10

interface Summary {
  total: number
  allowed: number
  masked: number
  confirm: number
  blocked: number
  pendingReview: number
}

interface EntityStat {
  entityType: string
  count: number
}

interface RecentBlocked {
  requestId: string
  timestamp: string
  riskScore: number | null
  triggeringEntityType: string | null
}

interface ProcessingTimeStats {
  averageMs: number | null
  maxMs: number | null
}

interface RepeatedViolation {
  userId: number
  username: string
  violationCount: number
}

interface AdminUser {
  id: number
  username: string
  email: string
  roles: string[]
  accountStatus: string
  createdAt: string
}

interface HistoryItem {
  requestId: string
  submittedAt: string
  status: string
  decision: string | null
  riskScore: number | null
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

// Triggers a browser download for a blob response - axios doesn't do this on its own.
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// todo.md Phase 30. ADMIN only (enforced by RoleProtectedRoute in App.tsx).
export function AdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [entityStats, setEntityStats] = useState<EntityStat[]>([])
  const [recentBlocked, setRecentBlocked] = useState<RecentBlocked[]>([])
  const [processingTime, setProcessingTime] = useState<ProcessingTimeStats | null>(null)
  // 48.3: the risk-distribution endpoint already existed (Phase 30) but nothing rendered it.
  const [riskBands, setRiskBands] = useState<RiskBandStat[]>([])
  const [repeatedViolations, setRepeatedViolations] = useState<RepeatedViolation[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  const [expandedUserId, setExpandedUserId] = useState<number | null>(null)
  const [userHistories, setUserHistories] = useState<Record<number, HistoryItem[]>>({})
  const [userHistoryLoadingId, setUserHistoryLoadingId] = useState<number | null>(null)

  const [usersPage, setUsersPage] = useState(0)
  const [usersData, setUsersData] = useState<PageResponse<AdminUser> | null>(null)
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null)

  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDashboardLoading(true)
    setDashboardError(null)
    Promise.all([
      apiClient.get<Summary>('/api/dashboard/summary'),
      apiClient.get<EntityStat[]>('/api/dashboard/entity-stats'),
      apiClient.get<RecentBlocked[]>('/api/dashboard/recent-blocked'),
      apiClient.get<ProcessingTimeStats>('/api/dashboard/processing-time'),
      apiClient.get<RepeatedViolation[]>('/api/dashboard/repeated-violations'),
      apiClient.get<RiskBandStat[]>('/api/dashboard/risk-distribution'),
    ])
      .then(([summaryRes, entityRes, blockedRes, processingRes, violationsRes, riskRes]) => {
        if (cancelled) return
        setSummary(summaryRes.data)
        setEntityStats(entityRes.data)
        setRecentBlocked(blockedRes.data)
        setProcessingTime(processingRes.data)
        setRepeatedViolations(violationsRes.data)
        setRiskBands(riskRes.data)
      })
      .catch((err) => {
        if (!cancelled) setDashboardError(extractErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setDashboardLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setUsersLoading(true)
    setUsersError(null)
    apiClient.get<PageResponse<AdminUser>>('/api/admin/users', { params: { page: usersPage, size: USERS_PAGE_SIZE } })
      .then((response) => { if (!cancelled) setUsersData(response.data) })
      .catch((err) => { if (!cancelled) setUsersError(extractErrorMessage(err)) })
      .finally(() => { if (!cancelled) setUsersLoading(false) })
    return () => { cancelled = true }
  }, [usersPage])

  const handleToggleStatus = async (user: AdminUser) => {
    setTogglingUserId(user.id)
    setUsersError(null)
    try {
      const action = user.accountStatus === 'ACTIVE' ? 'disable' : 'enable'
      const response = await apiClient.post<AdminUser>(`/api/admin/users/${user.id}/${action}`)
      setUsersData((prev) => prev
        ? { ...prev, content: prev.content.map((u) => (u.id === user.id ? response.data : u)) }
        : prev)
    } catch (err) {
      setUsersError(extractErrorMessage(err))
    } finally {
      setTogglingUserId(null)
    }
  }

  const handleToggleUserHistory = async (userId: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null)
      return
    }
    setExpandedUserId(userId)
    if (userHistories[userId]) return

    setUserHistoryLoadingId(userId)
    try {
      const response = await apiClient.get<PageResponse<HistoryItem>>(`/api/admin/users/${userId}/history`, { params: { size: 10 } })
      setUserHistories((prev) => ({ ...prev, [userId]: response.data.content }))
    } catch (err) {
      setDashboardError(extractErrorMessage(err))
    } finally {
      setUserHistoryLoadingId(null)
    }
  }

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(format)
    setExportError(null)
    try {
      const response = await apiClient.get(`/api/reports/export`, { params: { format }, responseType: 'blob' })
      downloadBlob(response.data as Blob, `screening-report.${format}`)
    } catch (err) {
      setExportError(extractErrorMessage(err))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="page-content page-content-wide">
      {/* The description states the window caveat up front. These panels genuinely use
          three different periods, and "the summary says 3 blocked but the database says
          30" is the most common question this page provokes. Phase 48 repeats the window
          on each chart; saying it once here covers the panels that are not charts. */}
      <PageHeader
        title="Admin Dashboard"
        description="Summary cards cover today only. Entity stats are all-time; the panels below use the last 7 days."
      />

      {dashboardError && <div className="banner banner-error">{dashboardError}</div>}
      {dashboardLoading && <LoadingState label="Loading dashboard…" />}

      {!dashboardLoading && summary && (
        <>
          <section className="admin-section">
            <h2>Summary (Today)</h2>
            <div className="stat-cards">
              <div className="stat-card">
                <div className="stat-card-value">{summary.total}</div>
                <div className="stat-card-label">Total</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{summary.allowed}</div>
                <div className="stat-card-label">Allowed</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{summary.masked}</div>
                <div className="stat-card-label">Masked</div>
              </div>
              {/* 41.6: Total has always counted CONFIRM decisions, but no card reported
                  them - so the cards could not be reconciled against the Total beside them. */}
              <div className="stat-card">
                <div className="stat-card-value">{summary.confirm}</div>
                <div className="stat-card-label">Confirm</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{summary.blocked}</div>
                <div className="stat-card-label">Blocked</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">{summary.pendingReview}</div>
                <div className="stat-card-label">Pending Review</div>
              </div>
            </div>
          </section>

          {/* 48.2/48.3/48.4: the hand-rolled CSS bar chart that used to sit here is
              replaced by real charts. Each states its own window on itself, because this
              page mixes today-only, all-time and 7-day figures. */}
          <div className="chart-grid">
            <RiskBandDonut data={riskBands} />
            <EntityBreakdownChart data={entityStats} />
          </div>

          <section className="admin-section">
            <h2>Recent Blocked</h2>
            {recentBlocked.length === 0 ? <EmptyState title="No blocked prompts recorded yet." /> : (
              <div className="table-scroll">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Risk Score</th>
                    <th>Triggering Entity Type</th>
                    <th>Request ID</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBlocked.map((item) => (
                    <tr key={item.requestId}>
                      <td>{formatDateTime(item.timestamp)}</td>
                      <td>{item.riskScore !== null ? Math.round(item.riskScore) : '—'}</td>
                      <td>{item.triggeringEntityType ?? '—'}</td>
                      <td className="request-id">{item.requestId.slice(0, 8)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </section>

          <section className="admin-section">
            <h2>Repeated Violations</h2>
            {repeatedViolations.length === 0 ? (
              <EmptyState
                title="No users with repeated violations in the last 7 days."
                hint="A user appears here after three or more BLOCK or REVIEW decisions in that window."
              />
            ) : (
              <div className="table-scroll">
              <table className="history-table">
                <thead>
                  <tr>
                    {/* 41.7: this panel exists to answer "who keeps tripping the screener",
                        and used to answer it with a bare numeric id - leaving an admin to
                        query the database by hand to find out who that actually was. */}
                    <th>User</th>
                    <th>Violation Count (7d)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {repeatedViolations.map((v) => (
                    <Fragment key={v.userId}>
                      <tr>
                        <td>{v.username}</td>
                        <td>{v.violationCount}</td>
                        <td>
                          <button type="button" className="btn-link" onClick={() => handleToggleUserHistory(v.userId)}>
                            {expandedUserId === v.userId ? 'Hide history' : 'View history'}
                          </button>
                        </td>
                      </tr>
                      {expandedUserId === v.userId && (
                        <tr className="history-detail-row">
                          <td colSpan={3}>
                            {userHistoryLoadingId === v.userId && <LoadingState label="Loading history…" />}
                            {userHistories[v.userId] && (
                              userHistories[v.userId].length === 0
                                ? <EmptyState title="This user has no prompt history." />
                                : (
                                  <table className="history-table">
                                    <thead>
                                      <tr>
                                        <th>Date/Time</th>
                                        <th>Risk Score</th>
                                        <th>Decision</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {userHistories[v.userId].map((item) => (
                                        <tr key={item.requestId}>
                                          <td>{formatDateTime(item.submittedAt)}</td>
                                          <td>{item.riskScore !== null ? Math.round(item.riskScore) : '—'}</td>
                                          <td>
                                            {item.decision
                                              ? <span className={`badge ${decisionBadgeClass(item.decision)}`}>{item.decision}</span>
                                              : '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </section>

          {/* 48.5: now shows the live figures against the recorded V1.0 baseline, so the
              dashboard demonstrates the Phase 43 optimisation instead of only the report
              claiming it. */}
          <ProcessingTimePanel data={processingTime} />
        </>
      )}

      <section className="admin-section">
        <h2>Export Report</h2>
        {exportError && <div className="banner banner-error">{exportError}</div>}
        <div className="btn-row">
          <button type="button" className="btn btn-secondary" disabled={exporting !== null} onClick={() => handleExport('csv')}>
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </button>
          <button type="button" className="btn btn-secondary" disabled={exporting !== null} onClick={() => handleExport('pdf')}>
            {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </section>

      <section className="admin-section">
        <h2>User Management</h2>
        {usersError && <div className="banner banner-error">{usersError}</div>}
        {usersLoading ? <LoadingState label="Loading users…" /> : usersData && (
          <>
            <div className="table-scroll">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {usersData.content.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.roles.join(', ')}</td>
                    <td>{user.accountStatus}</td>
                    <td>
                      <button
                        type="button"
                        className={user.accountStatus === 'ACTIVE' ? 'btn btn-danger' : 'btn btn-secondary'}
                        disabled={togglingUserId === user.id}
                        onClick={() => handleToggleStatus(user)}
                      >
                        {togglingUserId === user.id ? 'Working…' : user.accountStatus === 'ACTIVE' ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <div className="pagination">
              <button type="button" className="btn btn-secondary" onClick={() => setUsersPage((p) => p - 1)} disabled={usersData.first}>
                Previous
              </button>
              <span className="pagination-label">
                Page {usersData.number + 1} of {Math.max(usersData.totalPages, 1)}
              </span>
              <button type="button" className="btn btn-secondary" onClick={() => setUsersPage((p) => p + 1)} disabled={usersData.last}>
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
