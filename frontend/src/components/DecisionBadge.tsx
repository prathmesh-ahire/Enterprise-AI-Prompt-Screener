import { Icon, type IconName } from './Icon'

// Coloured by the *decision* itself, never
// by a score - a hard override (a REVIEW forced by an injection phrase on an
// otherwise low-scoring prompt) has to read as REVIEW, which a score-coloured badge would
// misrepresent. Every badge carries its icon AND its word, so colour is never the only
// signal. Replaces V1's decisionBadge.ts colour mapping.
const DECISION_ICON: Record<string, IconName> = {
  ALLOW: 'check',
  MASK: 'eye-slash',
  CONFIRM: 'question',
  REVIEW: 'eye',
  BLOCK: 'slashed-circle',
}

export function DecisionBadge({ decision, large = false }: { decision: string; large?: boolean }) {
  const icon = DECISION_ICON[decision]
  const classes = ['ps-badge', icon ? `ps-badge--${decision.toLowerCase()}` : '', large ? 'ps-badge--lg' : '']
    .filter(Boolean)
    .join(' ')
  return (
    <span className={classes}>
      {icon && <Icon name={icon} small />}
      {decision}
    </span>
  )
}
