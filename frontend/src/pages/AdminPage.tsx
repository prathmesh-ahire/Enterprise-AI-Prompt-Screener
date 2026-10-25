import { Fragment, useEffect, useState } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { EmptyState, LoadingState } from '../components/DataState'
import { PageHeader } from '../components/PageHeader'
import { EntityBreakdownChart, ProcessingTimePanel, RiskBandDonut, type RiskBandStat } from '../components/DashboardCharts'
import { DecisionBadge } from '../components/DecisionBadge'
import { Button } from '../components/Button'
import { PageMessage } from '../components/PageMessage'
import { Pagination } from '../components/Pagination'
import { RoleBadge } from '../components/RoleBadge'
import { AccountStatusPill } from '../components/StatusPill'
import { LiveSourceCaption } from '../components/SourceCaption'
import { entityLabel } from '../components/EntityChips'
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
  // When the dashboard's figures were loaded, for the panels' live captions.
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)

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
        setLoadedAt(new Date())
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
    <div className="page-content">
      {/* The description states the window caveat up front. These panels genuinely use
          three different periods; each panel also states its own in its caption. */}
      <PageHeader
        title="Admin dashboard"
        description="The summary covers today only. Entity counts are all-time; the panels below use the last 7 days."
      />

      {dashboardError && <PageMessage kind="error">{dashboardError}</PageMessage>}
      {dashboardLoading && <LoadingState label="Loading dashboard…" />}

      {!dashboardLoading && summary && (
        <div className="ps-stack admin-stack">
          <section className="ps-card">
            <h2 className="ps-card__title">Summary for today</h2>
            <div className="ps-metrics">
              {[
                ['Prompts screened', summary.total],
                ['ALLOW', summary.allowed],
                ['MASK', summary.masked],
                // 41.6: Total has always counted CONFIRM decisions, so they get a tile too.
                ['CONFIRM', summary.confirm],
                ['BLOCK', summary.blocked],
                ['Waiting for review', summary.pendingReview],
              ].map(([label, value]) => (
                <div className="ps-metric" key={label}>
                  <p className="ps-metric__value">{value}</p>
                  <p className="ps-metric__label">{label}</p>
                </div>
              ))}
            </div>
            <LiveSourceCaption window="today" updatedAt={loadedAt} />
          </section>

          <div className="chart-grid">
            <RiskBandDonut data={riskBands} updatedAt={loadedAt} />
            <EntityBreakdownChart data={entityStats} updatedAt={loadedAt} />
          </div>

          <section className="ps-card">
            <h2 className="ps-card__title">Recently blocked</h2>
            {recentBlocked.length === 0 ? <EmptyState title="No blocked prompts yet" hint="Prompts stopped with BLOCK appear here, newest first." /> : (
              <div className="ps-table-wrap">
                <table className="ps-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th className="ps-right">Risk score</th>
                      <th>Triggering item</th>
                      <th>Request ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBlocked.map((item) => (
                      <tr key={item.requestId} className="ps-tr">
                        <td className="ps-muted">{formatDateTime(item.timestamp)}</td>
                        <td className="ps-num">{item.riskScore !== null ? Math.round(item.riskScore) : '—'}</td>
                        <td>{item.triggeringEntityType ? entityLabel(item.triggeringEntityType) : '—'}</td>
                        <td className="ps-mono">{item.requestId.slice(0, 8)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="ps-card">
            <h2 className="ps-card__title">Repeated violations</h2>
            {repeatedViolations.length === 0 ? (
              <EmptyState
                title="No repeated violations in the last 7 days"
                hint="A user appears here after three or more BLOCK or REVIEW decisions in that window."
              />
            ) : (
              <div className="ps-table-wrap">
                <table className="ps-table">
                  <thead>
                    <tr>
                      {/* 41.7: answers "who keeps tripping the screener" by name, not id. */}
                      <th>User</th>
                      <th className="ps-right">Violations (7 days)</th>
                      <th><span className="ps-sr">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {repeatedViolations.map((v) => {
                      const open = expandedUserId === v.userId
                      const detailId = `violations-${v.userId}`
                      return (
                        <Fragment key={v.userId}>
                          <tr className="ps-tr">
                            <td>{v.username}</td>
                            <td className="ps-num">{v.violationCount}</td>
                            <td className="ps-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-expanded={open}
                                aria-controls={open ? detailId : undefined}
                                onClick={() => handleToggleUserHistory(v.userId)}
                              >
                                {open ? 'Hide history' : 'View history'}
                              </Button>
                            </td>
                          </tr>
                          {open && (
                            <tr className="ps-detail" id={detailId}>
                              <td colSpan={3}>
                                {userHistoryLoadingId === v.userId && <LoadingState label="Loading history…" />}
                                {userHistories[v.userId] && (
                                  userHistories[v.userId].length === 0
                                    ? <EmptyState title="This user has no prompt history" />
                                    : (
                                      <table className="ps-table">
                                        <thead>
                                          <tr>
                                            <th>Date and time</th>
                                            <th className="ps-right">Risk score</th>
                                            <th>Decision</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {userHistories[v.userId].map((item) => (
                                            <tr key={item.requestId}>
                                              <td className="ps-muted">{formatDateTime(item.submittedAt)}</td>
                                              <td className="ps-num">{item.riskScore !== null ? Math.round(item.riskScore) : '—'}</td>
                                              <td>{item.decision ? <DecisionBadge decision={item.decision} /> : '—'}</td>
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
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <ProcessingTimePanel data={processingTime} updatedAt={loadedAt} />
        </div>
      )}

      <div className="ps-stack admin-stack">
        <section className="ps-card">
          <h2 className="ps-card__title">Export a report</h2>
          {exportError && <PageMessage kind="error">{exportError}</PageMessage>}
          <div className="ps-row">
            <Button variant="secondary" disabled={exporting !== null} loading={exporting === 'csv'} onClick={() => handleExport('csv')}>
              {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Button variant="secondary" disabled={exporting !== null} loading={exporting === 'pdf'} onClick={() => handleExport('pdf')}>
              {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
            </Button>
          </div>
        </section>

        <section className="ps-card">
          <h2 className="ps-card__title">Users</h2>
          {usersError && <PageMessage kind="error">{usersError}</PageMessage>}
          {usersLoading ? <LoadingState label="Loading users…" /> : usersData && (
            <>
              <div className="ps-table-wrap">
                <table className="ps-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Roles</th>
                      <th>Status</th>
                      <th><span className="ps-sr">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.content.map((user) => (
                      <tr key={user.id} className="ps-tr">
                        <td>{user.username}</td>
                        <td className="ps-muted">{user.email}</td>
                        <td><span className="ps-row">{user.roles.map((r) => <RoleBadge key={r} role={r} />)}</span></td>
                        <td><AccountStatusPill status={user.accountStatus} /></td>
                        <td className="ps-right">
                          <Button
                            variant={user.accountStatus === 'ACTIVE' ? 'danger' : 'secondary'}
                            size="sm"
                            loading={togglingUserId === user.id}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {togglingUserId === user.id ? 'Working…' : user.accountStatus === 'ACTIVE' ? 'Disable' : 'Enable'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={usersData.number}
                totalPages={usersData.totalPages}
                first={usersData.first}
                last={usersData.last}
                onPrevious={() => setUsersPage((p) => p - 1)}
                onNext={() => setUsersPage((p) => p + 1)}
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
