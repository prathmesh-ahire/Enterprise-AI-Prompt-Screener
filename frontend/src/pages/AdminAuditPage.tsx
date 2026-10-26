import { AuditLegend } from '../components/AuditLegend'
import { AuditTable } from '../components/AuditTable'
import { PageHeader } from '../components/PageHeader'

// ADMIN only (enforced by RoleProtectedRoute in App.tsx). Everyone's audit events, newest first.
export function AdminAuditPage() {
  return (
    <div className="page-content">
      <PageHeader
        title="Audit log"
        description="Every recorded action across the system: who did what, when, and the risk band. It never holds prompt content."
      />
      <div className="ps-stack">
        <AuditTable
          endpoint="/api/audit/all"
          caption="All audit events, newest first."
          showUser
          emptyTitle="No audit events yet"
          emptyHint="Sign-ins, screened prompts, reviews and administrator changes are recorded here as they happen."
        />
        <AuditLegend />
      </div>
    </div>
  )
}
