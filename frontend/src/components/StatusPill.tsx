import { Icon, type IconName } from './Icon'

// The workflow state of a record, not
// its decision: neutral on purpose, so it never competes with the decision colours. The
// icon SHAPE carries the state and the word is always shown - no colour, ever.
interface StatusLook {
  label: string
  icon: IconName
  variant?: 'done' | 'live'
}

const PROMPT_STATUS: Record<string, StatusLook> = {
  MASKED: { label: 'Awaiting confirmation', icon: 'status-pending' },
  PENDING_CONFIRM: { label: 'Awaiting confirmation', icon: 'status-pending' },
  // An ALLOWED row only stays ALLOWED when its send to the model failed, so it is
  // waiting for a retry from the user, like the two above.
  ALLOWED: { label: 'Awaiting confirmation', icon: 'status-pending' },
  PENDING_REVIEW: { label: 'In review', icon: 'status-in-review' },
  COMPLETED: { label: 'Completed', icon: 'status-done', variant: 'done' },
  BLOCKED: { label: 'Not sent', icon: 'status-not-sent' },
}

const ACCOUNT_STATUS: Record<string, StatusLook> = {
  ACTIVE: { label: 'Active', icon: 'status-done', variant: 'done' },
  DISABLED: { label: 'Disabled', icon: 'status-disabled' },
}

function Pill({ look }: { look: StatusLook }) {
  return (
    <span className={`ps-status${look.variant ? ` ps-status--${look.variant}` : ''}`}>
      <Icon name={look.icon} />
      {look.label}
    </span>
  )
}

export function PromptStatusPill({ status }: { status: string }) {
  return <Pill look={PROMPT_STATUS[status] ?? { label: status, icon: 'status-pending' }} />
}

export function AccountStatusPill({ status }: { status: string }) {
  return <Pill look={ACCOUNT_STATUS[status] ?? { label: status, icon: 'status-pending' }} />
}

export function ModelStatusPill({ online }: { online: boolean }) {
  return (
    <Pill look={online
      ? { label: 'Online', icon: 'status-live', variant: 'live' }
      : { label: 'Unavailable', icon: 'status-pending' }} />
  )
}

export function ApprovedModelStatusPill({ active }: { active: boolean }) {
  return (
    <Pill look={active
      ? { label: 'Active', icon: 'status-done', variant: 'done' }
      : { label: 'Inactive', icon: 'status-pending' }} />
  )
}
