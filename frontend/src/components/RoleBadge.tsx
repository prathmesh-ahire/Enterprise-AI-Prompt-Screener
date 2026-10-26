import { Icon, type IconName } from './Icon'

// Who someone is: User, Reviewer or Admin.
// Admin is the only role in brand colour, because it can change policy. Never decision
// colours. Unknown role names render as plain outlined text.
const ROLES: Record<string, { label: string; icon: IconName; modifier?: string }> = {
  USER: { label: 'User', icon: 'person' },
  REVIEWER: { label: 'Reviewer', icon: 'eye', modifier: 'reviewer' },
  ADMIN: { label: 'Admin', icon: 'key', modifier: 'admin' },
}

export function RoleBadge({ role }: { role: string }) {
  const look = ROLES[role]
  if (!look) return <span className="ps-role">{role}</span>
  return (
    <span className={`ps-role${look.modifier ? ` ps-role--${look.modifier}` : ''}`}>
      <Icon name={look.icon} />
      {look.label}
    </span>
  )
}
