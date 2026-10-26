// What each action in the audit trail means. The trail holds who did what, when, and the
// risk band: never prompt content. The five decisions are logged under their own names.
export interface AuditAction {
  actions: readonly string[]
  meaning: string
}

export const DECISION_ACTIONS = ['ALLOW', 'MASK', 'CONFIRM', 'REVIEW', 'BLOCK'] as const

export const AUDIT_ACTIONS: readonly AuditAction[] = [
  { actions: ['SUBMITTED'], meaning: 'A prompt was received for screening.' },
  { actions: DECISION_ACTIONS, meaning: 'The decision the screener reached for that prompt.' },
  { actions: ['SENT_TO_AI'], meaning: 'The prompt, masked if it needed it, was sent to the model.' },
  { actions: ['SAFE', 'WITHHELD'], meaning: 'The model’s reply passed the response check, or was held back by it.' },
  {
    actions: ['REVIEWER_APPROVE', 'REVIEWER_REJECT', 'REVIEWER_REQUEST_CORRECTION', 'REVIEWER_FALSE_POSITIVE'],
    meaning: 'A reviewer’s action on a held prompt.',
  },
  { actions: ['LOGIN', 'LOGOUT'], meaning: 'An account signed in or out.' },
  { actions: ['PASSWORD_RESET_REQUESTED'], meaning: 'A password reset was requested.' },
  { actions: ['ADMIN_USER_ACTIVE', 'ADMIN_USER_DISABLED'], meaning: 'An administrator enabled or disabled an account.' },
  { actions: ['ADMIN_POLICY_UPDATED', 'ADMIN_RETENTION_UPDATED'], meaning: 'An administrator saved the policy or the retention period.' },
  { actions: ['ADMIN_ORG_TERM_ADDED', 'ADMIN_ORG_TERM_DELETED'], meaning: 'An administrator added or removed a confidential term.' },
  { actions: ['ADMIN_MODEL_ADDED', 'ADMIN_MODEL_ACTIVATED', 'ADMIN_MODEL_DEACTIVATED'], meaning: 'An administrator added, switched on or switched off an AI model.' },
]
