import { useEffect, useState } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import type { AuditEvent, PageResponse } from '../api/types'
import { EmptyState, LoadingState } from './DataState'
import { DecisionBadge } from './DecisionBadge'
import { PageMessage } from './PageMessage'
import { Pagination } from './Pagination'

// A page of audit events, newest first, with Previous / Next. `endpoint` picks whose events:
// the signed-in user's own, or (for an administrator) everyone's, which also shows who did it.
interface AuditTableProps {
  endpoint: '/api/audit/my-history' | '/api/audit/all'
  caption: string
  showUser?: boolean
  emptyTitle: string
  emptyHint: string
}

const PAGE_SIZE = 20

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function AuditTable({ endpoint, caption, showUser = false, emptyTitle, emptyHint }: AuditTableProps) {
  const [page, setPage] = useState(0)
  const [data, setData] = useState<PageResponse<AuditEvent> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiClient.get<PageResponse<AuditEvent>>(endpoint, { params: { page, size: PAGE_SIZE } })
      .then((response) => { if (!cancelled) setData(response.data) })
      .catch((err) => { if (!cancelled) setError(extractErrorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [endpoint, page])

  if (error) return <PageMessage kind="error">{error}</PageMessage>
  if (loading) return <LoadingState label="Loading the audit trail…" />
  if (!data || data.totalElements === 0) return <EmptyState title={emptyTitle} hint={emptyHint} />

  return (
    <div className="ps-stack">
      <div className="ps-table-wrap">
        <table className="ps-table">
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th>Time</th>
              {showUser && <th>User</th>}
              <th>Action</th>
              <th>Risk band</th>
              <th>Request ID</th>
            </tr>
          </thead>
          <tbody>
            {data.content.map((event) => (
              <tr key={event.id} className="ps-tr">
                <td className="ps-muted">{formatDateTime(event.createdAt)}</td>
                {showUser && <td>{event.username ?? '—'}</td>}
                <td><code>{event.action}</code></td>
                <td>{event.riskBand ? <DecisionBadge decision={event.riskBand} /> : '—'}</td>
                <td>{event.requestId ? <code>{event.requestId}</code> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={data.number}
        totalPages={data.totalPages}
        first={data.first}
        last={data.last}
        onPrevious={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />
    </div>
  )
}
