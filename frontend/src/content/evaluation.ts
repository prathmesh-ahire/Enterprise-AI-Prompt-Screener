// The figures behind the Evaluation page that are counts, so every percentage on the page
// is calculated from them. Results recorded in earlier phases carry their source and date;
// the audit corpora and their harnesses were deleted after use and cannot be re-run.

export interface RecallRow {
  entityType: string
  hit: number
  of: number
  // Set when the figure was recorded before a later fix.
  note?: string
}

export function recallPercent(row: RecallRow): number {
  return (row.hit / row.of) * 100
}

export const percentFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Public synthetic PII dataset: carrier sentences from its English file of 43,501 rows, with
// values localised to this project's scope. Only the four labels this project detects are scored.
export const PUBLIC_AUDIT_ROWS: readonly RecallRow[] = [
  { entityType: 'PERSONAL_EMAIL', hit: 4033, of: 4033 },
  { entityType: 'PHONE_NUMBER', hit: 2406, of: 2408 },
  { entityType: 'PAYMENT_CARD', hit: 2550, of: 2560 },
  { entityType: 'PASSWORD_SECRET', hit: 1485, of: 2601, note: 'Recorded before the 2026-09-22 fix, which made the password detector read a value written before its keyword.' },
]

export const PUBLIC_AUDIT_SOURCE = {
  source: 'Public dataset audit, English file of 43,501 rows', date: '2026-08-16', kind: 'recorded',
} as const

// A corpus commissioned for this project, after the duplicates were removed.
export const COMMISSIONED_ROWS: readonly RecallRow[] = [
  { entityType: 'AADHAAR_LIKE_ID', hit: 199, of: 199 },
  { entityType: 'PAN_LIKE_ID', hit: 217, of: 217 },
  { entityType: 'ORG_CONFIDENTIAL', hit: 140, of: 140 },
  { entityType: 'PRIVATE_KEY', hit: 17, of: 17 },
  { entityType: 'API_KEY', hit: 169, of: 198, note: 'Recorded before the 2026-10-09 fix for base64-style keys, which the base64 key set below measures separately.' },
]

export const COMMISSIONED_SOURCE = {
  source: 'Commissioned corpus audit', date: '2026-08-16', kind: 'recorded',
} as const

// The 541-item manual test pass, one row per section, exactly as the report's section
// headings give them. "other" names the items that were not a plain pass.
export interface ManualSection {
  id: string
  area: string
  passed: number
  total: number
  other?: string
}

export const MANUAL_SECTIONS: readonly ManualSection[] = [
  { id: 'A', area: 'Startup and health', passed: 12, total: 12 },
  { id: 'B', area: 'Register and login', passed: 16, total: 18, other: '2 FAIL' },
  { id: 'C', area: 'Password reset', passed: 9, total: 9 },
  { id: 'D', area: 'Access control and roles', passed: 22, total: 22 },
  { id: 'E', area: 'Rate limiting', passed: 6, total: 6 },
  { id: 'F', area: 'Input validation', passed: 12, total: 12 },
  { id: 'G', area: 'The 9 detectors', passed: 43, total: 44, other: '1 FAIL' },
  { id: 'H', area: 'The 7 risk signals', passed: 13, total: 14, other: '1 FAIL' },
  { id: 'I', area: 'Decisions and overrides', passed: 16, total: 16 },
  { id: 'J', area: 'Masking', passed: 10, total: 10 },
  { id: 'K', area: 'AI gateway and offline mode', passed: 8, total: 8 },
  { id: 'L', area: 'Response safety', passed: 6, total: 6 },
  { id: 'M', area: 'Confirm flow', passed: 9, total: 9 },
  { id: 'N', area: 'Reviewer workflow', passed: 15, total: 15 },
  { id: 'O', area: 'History page', passed: 14, total: 14 },
  { id: 'P', area: 'Admin: users', passed: 7, total: 8, other: '1 N/A' },
  { id: 'Q', area: 'Admin: policy', passed: 15, total: 16, other: '1 Partial' },
  { id: 'R', area: 'Admin: org terms', passed: 7, total: 8, other: '1 FAIL' },
  { id: 'S', area: 'Admin: models', passed: 8, total: 8 },
  { id: 'T', area: 'Admin: retention', passed: 5, total: 5 },
  { id: 'U', area: 'Dashboard panels', passed: 11, total: 12, other: '1 N/A' },
  { id: 'V', area: 'Reports', passed: 9, total: 9 },
  { id: 'W', area: 'Audit log', passed: 8, total: 8 },
  { id: 'X', area: 'Privacy', passed: 11, total: 12, other: '1 FAIL' },
  { id: 'Y', area: 'UI behaviour and error states', passed: 14, total: 14 },
  { id: 'Z', area: 'Demo dry run', passed: 12, total: 12 },
  { id: 'AA', area: 'Automated test suites', passed: 6, total: 6 },
  { id: 'AB', area: 'Edge cases', passed: 12, total: 12 },
  { id: 'AC', area: 'V1.1 bug-fix verification', passed: 20, total: 20 },
  { id: 'AD', area: 'Theme and appearance', passed: 14, total: 14 },
  { id: 'AE', area: 'Component behaviour', passed: 16, total: 16 },
  { id: 'AF', area: 'Layout and responsiveness', passed: 14, total: 14 },
  { id: 'AG', area: 'Dashboard charts', passed: 14, total: 14 },
  { id: 'AH', area: 'Accessibility and motion', passed: 12, total: 12 },
  { id: 'AI', area: 'Performance and database', passed: 10, total: 10 },
  { id: 'AJ', area: 'V1.2: anything detected is masked', passed: 14, total: 14 },
  { id: 'AK', area: 'V1.2: payment card issuer validation', passed: 12, total: 12 },
  { id: 'AL', area: 'V1.2: secrets written the way people actually write them', passed: 32, total: 34, other: '2 FAIL' },
  { id: 'AM', area: 'Things that must NOT be detected', passed: 22, total: 22 },
  { id: 'AN', area: 'Realistic end-to-end scenarios', passed: 13, total: 14, other: '1 Not tested' },
]

export const MANUAL_SOURCE = {
  source: 'Manual test results report, sections A to AN', date: '2026-09-22', kind: 'recorded',
} as const

// The four root causes behind the eight failed items, all fixed on 2026-09-22.
export const MANUAL_ROOT_CAUSES: readonly { problem: string; items: string; fix: string }[] = [
  {
    problem: 'A tampered or deleted sign-in token was not rejected when the page reloaded.',
    items: 'B12, B13',
    fix: 'The page now checks that the saved token is well formed and not expired when it loads. The server still checks the signature on every request.',
  },
  {
    problem: 'A password written before its keyword, in the form "[value] is my password", was not detected.',
    items: 'G21d, AL9, AL10',
    fix: 'The password detector now reads a value on either side of its keyword.',
  },
  {
    problem: 'The table of risk signals kept a verbatim fragment of the prompt.',
    items: 'H14, X12',
    fix: 'A matched phrase is now stored as the project’s own known phrase, not as the text the user typed.',
  },
  {
    problem: 'The same confidential term could be added twice.',
    items: 'R8',
    fix: 'Adding a term that is already active is now refused, whatever its case.',
  },
]
