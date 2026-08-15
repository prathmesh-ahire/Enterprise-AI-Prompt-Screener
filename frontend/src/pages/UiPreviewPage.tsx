import { useState } from 'react'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { EntityChips } from '../components/EntityChips'
import { InlineLoading } from '../components/Loading'
import { RiskScoreBar } from '../components/RiskScoreBar'
import { ThemeToggle } from '../components/ThemeToggle'
import { decisionBadgeClass } from '../components/decisionBadge'

// ============================================================================
// TEMPORARY — Phase 45 only. DELETE AT THE END OF PHASE 47.
// ----------------------------------------------------------------------------
// Phase 45 builds the component library, but Phase 47 is what puts it on the
// real pages - so between the two there is nothing that renders a disabled
// button, an errored input or an expanded table row for 45.8 to check. This
// page is that surface: every component in every state, in one place, driven
// by Playwright in both themes.
//
// Deliberately a PUBLIC route. It holds no data of any kind - every value below
// is a literal written into this file - so there is nothing to protect, and
// keeping it outside ProtectedRoute means the browser checks can reach it
// without a login and without burning the 5/min auth rate limit on every run.
// It is not linked from the navbar; you have to know the URL.
//
// Once Phase 47 has the real pages using these components, this file and its
// route in App.tsx both go.
// ============================================================================

const DECISIONS = ['ALLOW', 'MASK', 'CONFIRM', 'REVIEW', 'BLOCK']

export function UiPreviewPage() {
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="page-content page-content-wide" data-testid="ui-preview">
      <div className="navbar" style={{ marginBottom: 24 }}>
        <span className="navbar-brand">Enterprise AI Prompt Screener</span>
        <div className="navbar-links">
          {/* Plain anchors, not NavLinks - this is a style specimen, and a real
              NavLink here would navigate away from the page under test. */}
          <a href="#buttons" className="active">Prompt</a>
          <a href="#buttons">History</a>
          <a href="#buttons">Review Queue</a>
          <span className="navbar-user">demo_user1</span>
          <span className="role-badge">USER</span>
          <ThemeToggle />
        </div>
      </div>

      <h1>Component library — Phase 45</h1>
      <p className="form-field-hint" style={{ marginBottom: 32 }}>
        Temporary specimen page. Removed at the end of Phase 47.
      </p>

      {/* ---------------------------------------------------------------- 45.1 */}
      <section className="admin-section" id="buttons">
        <h2>45.1 Buttons</h2>
        <div className="btn-row" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
          <Button data-testid="btn-primary">Primary</Button>
          <Button variant="secondary" data-testid="btn-secondary">Secondary</Button>
          <Button variant="danger" data-testid="btn-danger">Destructive</Button>
        </div>
        <div className="btn-row" style={{ flexWrap: 'wrap' }}>
          <Button disabled data-testid="btn-disabled">Disabled</Button>
          <Button variant="secondary" disabled>Disabled secondary</Button>
          <Button loading={loading} onClick={() => { setLoading(true); window.setTimeout(() => setLoading(false), 2500) }} data-testid="btn-loading">
            {loading ? 'Screening…' : 'Click to load 2.5s'}
          </Button>
          <button type="button" className="btn-link" data-testid="btn-link">Text link button</button>
        </div>
      </section>

      {/* ---------------------------------------------------------------- 45.3 */}
      <section className="admin-section">
        <h2>45.3 Form controls</h2>
        <div className="form-field">
          <label htmlFor="p-text">Text input</label>
          <input id="p-text" defaultValue="demo_user1" data-testid="input-normal" />
        </div>
        <div className="form-field">
          <label htmlFor="p-err">Input with an error</label>
          <input id="p-err" className="input-error" aria-invalid="true" defaultValue="" data-testid="input-error" />
          <span className="form-field-error">Username is required</span>
        </div>
        <div className="form-field">
          <label htmlFor="p-sel">Select</label>
          <select id="p-sel" data-testid="input-select" defaultValue="MASK">
            {DECISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="p-ta">Textarea</label>
          <textarea id="p-ta" className="prompt-textarea" rows={3} defaultValue="Summarise this quarter's roadmap." data-testid="input-textarea" />
          <div className="char-counter">41 / 2000</div>
        </div>
        <div className="form-field">
          <label htmlFor="p-dis">Disabled</label>
          <input id="p-dis" disabled defaultValue="Cannot edit" data-testid="input-disabled" />
        </div>
        <div className="char-counter char-counter-over" data-testid="counter-over">2104 / 2000 — too long</div>
      </section>

      {/* ---------------------------------------------------------------- 45.4 */}
      <section className="admin-section">
        <h2>45.4 Cards</h2>
        <div className="stat-cards" style={{ marginBottom: 16 }}>
          {[['128', 'Total'], ['96', 'Allowed'], ['14', 'Masked'], ['6', 'Confirm'], ['12', 'Blocked']].map(([v, l]) => (
            <div className="stat-card" key={l} data-testid={`stat-card-${l.toLowerCase()}`}>
              <div className="stat-card-value">{v}</div>
              <div className="stat-card-label">{l}</div>
            </div>
          ))}
        </div>
        <div className="card card-lift" data-testid="card-plain" style={{ maxWidth: 460 }}>
          <div className="card-header">Plain card — lift only</div>
          <p>No tilt and no curtain: this one holds body text, and rotating readable copy is exactly what 45.4 rules out.</p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- 45.5 */}
      <section className="admin-section">
        <h2>45.5 Badges and chips</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {DECISIONS.map((d) => (
            <span key={d} className={`badge ${decisionBadgeClass(d)}`} data-testid={`badge-${d}`}>{d}</span>
          ))}
          <span className="badge badge-neutral">NEUTRAL</span>
          <span className="badge badge-safe">REACHABLE</span>
        </div>
        <EntityChips entityTypes={['PRIVATE_KEY', 'API_KEY', 'PAYMENT_CARD', 'ORG_CONFIDENTIAL', 'PERSONAL_EMAIL', 'PHONE_NUMBER']} />
        <div className="signal-chips">
          <span className="signal-chip">INSTRUCTION_OVERRIDE</span>
          <span className="signal-chip">SECRET_EXTRACTION</span>
          <span className="signal-chip">REPEATED_ATTACK_PATTERN</span>
        </div>
        <RiskScoreBar score={72.4} />
      </section>

      {/* ---------------------------------------------------------------- 45.6 */}
      <section className="admin-section">
        <h2>45.6 Tables</h2>
        <table className="history-table" data-testid="preview-table">
          <thead>
            <tr><th>Submitted</th><th>Decision</th><th>Score</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr className="history-row" onClick={() => setExpanded(!expanded)} data-testid="table-row">
              <td>2026-08-15 14:02</td>
              <td><span className={`badge ${decisionBadgeClass('BLOCK')}`}>BLOCK</span></td>
              <td>88.1</td>
              <td>BLOCKED</td>
            </tr>
            {expanded && (
              <tr className="history-detail-row" data-testid="table-detail-row">
                <td colSpan={4}>
                  <div className="history-detail">Expanded row — same raised surface as the header, with an accent rule down the left edge.</div>
                </td>
              </tr>
            )}
            <tr className="history-row">
              <td>2026-08-15 13:47</td>
              <td><span className={`badge ${decisionBadgeClass('ALLOW')}`}>ALLOW</span></td>
              <td>4.2</td>
              <td>COMPLETED</td>
            </tr>
          </tbody>
        </table>
        <div className="pagination">
          <Button variant="secondary" disabled>Previous</Button>
          <span className="pagination-label">Page 1 of 4</span>
          <Button variant="secondary">Next</Button>
        </div>
      </section>

      {/* ---------------------------------------------------------------- 45.7 */}
      <section className="admin-section">
        <h2>45.7 Feedback surfaces</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <Alert kind="success" title="Policy saved">Thresholds updated. The next prompt uses them.</Alert>
          <Alert kind="error" title="Submission failed">The AI service did not respond. Try again.</Alert>
          <Alert kind="warning" title="Masked before sending">Sensitive values were replaced with placeholders.</Alert>
          <Alert kind="info">Retention is set to 90 days.</Alert>
        </div>
        <div className="banner banner-error" data-testid="banner-error">Invalid username or password</div>
        <div className="banner banner-success" data-testid="banner-success">Account created. You can sign in now.</div>
        <div className="alert-block" data-testid="alert-block" style={{ marginBottom: 12 }}>
          <strong>Blocked.</strong> This prompt contains a private key and was not sent to the model.
        </div>
        <div className="alert-review" data-testid="alert-review">
          <p>Sent for human review. A reviewer will decide whether this can proceed.</p>
          <p>Request <span className="request-id">8f2c…a91</span></p>
        </div>
        <InlineLoading label="Screening prompt…" />
      </section>
    </div>
  )
}
