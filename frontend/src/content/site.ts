// The public site's strings, lists and figures, kept in one place so no page hard-codes a
// number. Examples, formula weights, thresholds and placeholders come from
// pipeline-snapshot.json, which a backend test keeps in step with the real pipeline.

export const WORDMARK = 'Prompt Screener'
export const PRODUCT_NAME = 'Enterprise AI Prompt Screener'

// Where "Open the app" leads for every visitor. Signed-out visitors are sent on to sign in.
export const APP_ENTRY_PATH = '/dashboard'

export interface PublicPage {
  path: string
  label: string
  description: string
}

// The seven public pages, in the order the header shows them.
export const PUBLIC_PAGES: readonly PublicPage[] = [
  { path: '/', label: 'Home', description: 'Every prompt is screened before it reaches the model.' },
  { path: '/how-it-works', label: 'How it works', description: 'How a prompt is checked, scored and decided before anything is sent on.' },
  { path: '/detectors', label: 'Detectors', description: 'What each detector looks for, and what it deliberately ignores.' },
  { path: '/examples', label: 'Examples', description: 'Real pipeline results for synthetic prompts.' },
  { path: '/evaluation', label: 'Evaluation', description: 'How well the screening works, with the source of every figure.' },
  { path: '/limitations', label: 'Limitations', description: 'What the system does not do, and the trade-offs it keeps.' },
  { path: '/architecture', label: 'Architecture', description: 'How the parts fit together on one machine.' },
]

export const PUBLIC_PAGE = Object.fromEntries(
  PUBLIC_PAGES.map((p) => [p.path, p]),
) as Record<string, PublicPage>

export const FOOTER_DESCRIPTION =
  'Screens every prompt on this machine for sensitive data and injection attempts before it can reach an AI model.'
export const OFFLINE_STATEMENT = 'Runs on one machine and works without an internet connection.'

export interface FooterLink {
  label: string
  to: string
}

export const FOOTER_GROUPS: readonly { heading: string; links: readonly FooterLink[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Detectors', to: '/detectors' },
      { label: 'Examples', to: '/examples' },
    ],
  },
  {
    heading: 'Evidence',
    links: [
      { label: 'Evaluation', to: '/evaluation' },
      { label: 'Limitations', to: '/limitations' },
      { label: 'Architecture', to: '/architecture' },
    ],
  },
  {
    heading: 'App',
    links: [
      { label: 'Open the app', to: APP_ENTRY_PATH },
      { label: 'Sign in', to: '/login' },
    ],
  },
]

export const NOT_FOUND = {
  title: 'Page not found',
  text: 'There is nothing at this address. It may have moved, or the link may be wrong.',
  action: 'Go home',
}

// The text of a page's browser tab: "<page> · Enterprise AI Prompt Screener".
export const pageTitle = (label: string) => `${label} · ${PRODUCT_NAME}`

// Tab names for the pages inside the app and the sign-in pages.
export const APP_PAGE_LABELS: Record<string, string> = {
  '/login': 'Sign in',
  '/register': 'Create an account',
  '/forgot-password': 'Forgot password',
  '/reset-password': 'Reset password',
  '/prompt': 'Prompt',
  '/history': 'History',
  '/review': 'Review queue',
  '/admin': 'Admin dashboard',
  '/admin/policy': 'Policy',
  '/admin/models': 'Models',
}

// A figure the site shows. "measured" means it was re-run when the site was built;
// "recorded" means it was measured earlier and is quoted with its date.
export interface Figure {
  value: number | string
  label: string
  source: string
  date: string
  kind: 'measured' | 'recorded'
}

const MEASURED = '2026-10-26'

export const FIGURES = {
  // Automated checks, re-measured.
  backendTests: {
    value: 249, label: 'automated backend tests, all passing',
    source: 'Maven test run (./mvnw test), current test classes only', date: MEASURED, kind: 'measured',
  },
  regressionChecks: {
    value: 43, label: 'checks in the regression script, all passing',
    source: 'regression.sh run against a running system', date: MEASURED, kind: 'measured',
  },
  // Synthetic dataset of 20 prompts the project wrote itself.
  syntheticPassed: {
    value: 20, label: 'of 20 synthetic prompts screened exactly as expected',
    source: 'SyntheticDatasetEvaluationTest, test-prompts.json', date: MEASURED, kind: 'measured',
  },
  syntheticPrecision: {
    value: '100.00%', label: 'entity detection precision on the synthetic set',
    source: 'SyntheticDatasetEvaluationTest, test-prompts.json', date: MEASURED, kind: 'measured',
  },
  syntheticRecall: {
    value: '100.00%', label: 'entity detection recall on the synthetic set',
    source: 'SyntheticDatasetEvaluationTest, test-prompts.json', date: MEASURED, kind: 'measured',
  },
  syntheticF1: {
    value: '100.00%', label: 'entity detection F1-score on the synthetic set',
    source: 'SyntheticDatasetEvaluationTest, test-prompts.json', date: MEASURED, kind: 'measured',
  },
  // Base64-style API keys and the harmless lines that look similar.
  base64Caught: {
    value: 143, label: 'of 145 base64-style keys caught in a test set',
    source: 'ApiKeyBase64CorpusTest, base64-secret-corpus.txt', date: MEASURED, kind: 'measured',
  },
  base64Recall: {
    value: '98.6%', label: 'recall on the base64-style key set',
    source: 'ApiKeyBase64CorpusTest, base64-secret-corpus.txt', date: MEASURED, kind: 'measured',
  },
  benignFalseAlarms: {
    value: 0, label: 'false alarms on 202 harmless test lines',
    source: 'ApiKeyBase64CorpusTest, benign-slash-corpus.txt', date: MEASURED, kind: 'measured',
  },
  // Screening time with the AI model excluded: the run with the middle average of three runs
// of the same test, so the average and the slowest prompt come from the same run.
  latencyAverageMs: {
    value: 17.64, label: 'ms average screening time, before the AI model, on the test machine',
    source: 'ScreeningPipelineLatencyTest, 50 prompts, middle run of 3', date: MEASURED, kind: 'measured',
  },
  latencyMaxMs: {
    value: 72, label: 'ms slowest screening time, before the AI model, on the test machine',
    source: 'ScreeningPipelineLatencyTest, 50 prompts, middle run of 3', date: MEASURED, kind: 'measured',
  },
  // Recorded earlier and quoted with their dates.
  ollamaAverageMs: {
    value: 12252.2, label: 'ms average AI model reply, CPU only',
    source: 'Five timed calls after a discarded warm-up call', date: '2026-08-05', kind: 'recorded',
  },
  ollamaMaxMs: {
    value: 14556, label: 'ms slowest AI model reply, CPU only',
    source: 'Five timed calls after a discarded warm-up call', date: '2026-08-05', kind: 'recorded',
  },
  statementsBefore: {
    value: 26, label: 'database statements per prompt submission, before the query reduction',
    source: 'Counted from the backend log around one submission', date: '2026-08-15', kind: 'recorded',
  },
  statementsAfter: {
    value: 17, label: 'database statements per prompt submission, after the query reduction',
    source: 'Counted from the backend log around one submission', date: '2026-08-15', kind: 'recorded',
  },
  // The manual test pass. Only the figures every part of its report agrees on are listed.
  manualItems: {
    value: 541, label: 'items in the manual test pass',
    source: 'Manual test results report, sections A to AN', date: '2026-09-22', kind: 'recorded',
  },
  manualFailed: {
    value: 8, label: 'of those failed, from 4 root causes, all fixed',
    source: 'Manual test results report, defects found', date: '2026-09-22', kind: 'recorded',
  },
} as const satisfies Record<string, Figure>

// Public synthetic PII dataset, English file, with values localised to this project's scope.
// Recorded after the audit's own fixes; a later fix to the password detector came afterwards.
export const PUBLIC_DATASET_AUDIT: readonly Figure[] = [
  { value: '100.00% (4033/4033)', label: 'Email address', source: 'Public dataset audit, English file of 43,501 rows', date: '2026-08-16', kind: 'recorded' },
  { value: '99.92% (2406/2408)', label: 'Phone number', source: 'Public dataset audit, English file of 43,501 rows', date: '2026-08-16', kind: 'recorded' },
  { value: '99.61% (2550/2560)', label: 'Payment card', source: 'Public dataset audit, English file of 43,501 rows', date: '2026-08-16', kind: 'recorded' },
  { value: '57.09% (1485/2601)', label: 'Password', source: 'Public dataset audit, English file of 43,501 rows', date: '2026-08-16', kind: 'recorded' },
  { value: '89.42%', label: 'Prompts with every item detected', source: 'Public dataset audit, English file of 43,501 rows', date: '2026-08-16', kind: 'recorded' },
  { value: '99.64% (of 12,000)', label: 'Harmless rows left clean', source: 'Public dataset audit, 12,000 harmless rows', date: '2026-08-16', kind: 'recorded' },
]

// A corpus commissioned for this project. The API-key figure was recorded before the
// 2026-10-09 fix for base64-style keys.
export const COMMISSIONED_CORPUS_AUDIT: readonly Figure[] = [
  { value: '100% (199/199)', label: 'Aadhaar number', source: 'Commissioned corpus audit', date: '2026-08-16', kind: 'recorded' },
  { value: '100% (217/217)', label: 'PAN number', source: 'Commissioned corpus audit', date: '2026-08-16', kind: 'recorded' },
  { value: '100% (140/140)', label: 'Confidential term', source: 'Commissioned corpus audit', date: '2026-08-16', kind: 'recorded' },
  { value: '100% (17/17)', label: 'Private key', source: 'Commissioned corpus audit', date: '2026-08-16', kind: 'recorded' },
  { value: '85.35% (169/198)', label: 'API key', source: 'Commissioned corpus audit', date: '2026-08-16', kind: 'recorded' },
  { value: '95.40%', label: 'Prompts with every item detected', source: 'Commissioned corpus audit', date: '2026-08-16', kind: 'recorded' },
  { value: '0 of 100', label: 'False positives on harmless rows', source: 'Commissioned corpus audit', date: '2026-08-16', kind: 'recorded' },
  { value: '1,500 delivered, 731 usable', label: 'Rows after removing 769 exact duplicates (51%)', source: 'Commissioned corpus audit', date: '2026-08-16', kind: 'recorded' },
]
