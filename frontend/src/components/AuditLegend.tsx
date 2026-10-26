import { AUDIT_ACTIONS, DECISION_ACTIONS } from '../content/audit'
import { DecisionBadge } from './DecisionBadge'

// What each action in an audit trail means, and what the trail never holds.
const isDecision = (action: string) => (DECISION_ACTIONS as readonly string[]).includes(action)

export function AuditLegend() {
  return (
    <section className="ps-card" aria-labelledby="audit-legend-title">
      <h2 className="ps-card__title" id="audit-legend-title">What the actions mean</h2>
      <p className="ps-card__text">
        The trail records who did what and when, with the risk band. It holds types and counts, never prompt content.
      </p>
      <table className="ps-rows">
        <caption className="ps-sr">Audit actions and what each one means</caption>
        <tbody>
          {AUDIT_ACTIONS.map((row) => (
            <tr key={row.actions.join('-')}>
              <th scope="row">
                <span className="ps-row">
                  {row.actions.map((action) => (
                    isDecision(action)
                      ? <DecisionBadge key={action} decision={action} />
                      : <code key={action}>{action}</code>
                  ))}
                </span>
              </th>
              <td>{row.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
