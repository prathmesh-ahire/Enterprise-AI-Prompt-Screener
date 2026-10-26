// Tiering mirrors
// RiskSubScoreCalculator's SEVERITY_WEIGHT (backend) exactly - CRITICAL =
// key/password material, HIGH = financial/govt-ID/org data, MEDIUM = basic PII - which is
// the real mapping, not the design's placeholder one.
// Only ever renders the entity *type*, never the underlying value (PromptResponseDto
// carries labels only). Each chip prints its severity word, so colour is never the only cue.
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

// Sentence case.
const ENTITY_LABELS: Record<string, string> = {
  PRIVATE_KEY: 'Private key',
  API_KEY: 'API key',
  PASSWORD_SECRET: 'Password',
  PAYMENT_CARD: 'Payment card',
  AADHAAR_LIKE_ID: 'Aadhaar number',
  ORG_CONFIDENTIAL: 'Confidential term',
  PAN_LIKE_ID: 'PAN number',
  PHONE_NUMBER: 'Phone number',
  PERSONAL_EMAIL: 'Email address',
}

const TIER_WORD = { critical: 'Critical', high: 'High', medium: 'Medium' } as const

export function entityLabel(type: string): string {
  return ENTITY_LABELS[type] ?? type.replace(/_/g, ' ')
}

function entityTier(type: string): 'critical' | 'high' | 'medium' {
  return ENTITY_TIERS[type] ?? 'medium'
}

export function EntityChips({ entityTypes }: { entityTypes: string[] }) {
  if (entityTypes.length === 0) return null
  return (
    <div className="ps-chips">
      {entityTypes.map((type) => {
        const tier = entityTier(type)
        return (
          <span key={type} className={`ps-chip ps-chip--${tier}`}>
            <span className="ps-chip__sev">{TIER_WORD[tier]}</span>
            {entityLabel(type)}
          </span>
        )
      })}
    </div>
  )
}
