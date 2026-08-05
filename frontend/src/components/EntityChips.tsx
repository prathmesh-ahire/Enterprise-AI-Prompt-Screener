// todo.md Phase 27.3. Tiering mirrors RiskSubScoreCalculator's SEVERITY_WEIGHT (backend
// Phase 11.1.1) exactly - CRITICAL = key/password material, HIGH = financial/govt-ID/org
// data, MEDIUM = basic PII - so a chip's colour always agrees with how much that entity
// type actually weighs in the risk score. Only ever renders the entity *type*, never the
// underlying value (PromptResponseDto.entityTypes carries labels only, per AGENTS.md).
const ENTITY_TIERS: Record<string, 'critical' | 'high' | 'medium'> = {
  PRIVATE_KEY: 'critical',
  API_KEY: 'critical',
  PASSWORD_SECRET: 'critical',
  PAYMENT_CARD: 'high',
  AADHAAR_LIKE_ID: 'high',
  ORG_CONFIDENTIAL: 'high',
  PAN_LIKE_ID: 'medium',
  PHONE_NUMBER: 'medium',
  PERSONAL_EMAIL: 'medium',
}

const ENTITY_LABELS: Record<string, string> = {
  PRIVATE_KEY: 'Private Key',
  API_KEY: 'API Key',
  PASSWORD_SECRET: 'Password',
  PAYMENT_CARD: 'Payment Card',
  AADHAAR_LIKE_ID: 'Aadhaar-like ID',
  ORG_CONFIDENTIAL: 'Org Confidential',
  PAN_LIKE_ID: 'PAN-like ID',
  PHONE_NUMBER: 'Phone Number',
  PERSONAL_EMAIL: 'Email',
}

export function entityLabel(type: string): string {
  return ENTITY_LABELS[type] ?? type.replace(/_/g, ' ')
}

export function EntityChips({ entityTypes }: { entityTypes: string[] }) {
  if (entityTypes.length === 0) return null
  return (
    <div className="entity-chips">
      {entityTypes.map((type) => (
        <span key={type} className={`entity-chip entity-chip-${ENTITY_TIERS[type] ?? 'medium'}`}>
          {entityLabel(type)}
        </span>
      ))}
    </div>
  )
}
