import { PIPELINE } from './snapshot'

// How the system is put together, read from the code and its build files when the page was
// written (2026-10-26). Versions are those declared in pom.xml, package.json, the Dockerfiles
// and docker-compose.yml.

export const ARCHITECTURE_SOURCE = {
  source: 'pom.xml, package.json, docker-compose.yml and the backend code', date: '2026-10-26', kind: 'measured',
} as const

export interface Tech {
  name: string
  version?: string
  role: string
}

export interface TechGroup {
  heading: string
  items: readonly Tech[]
}

export const TECH_STACK: readonly TechGroup[] = [
  {
    heading: 'Back end',
    items: [
      { name: 'Java', version: '21', role: 'The language the whole back end is written in.' },
      { name: 'Spring Boot', version: '4.1.0', role: 'The web server, with Spring Security for sign-in and roles, Spring Data JPA for the database and Bean Validation for request checks.' },
      { name: 'Spring AI', version: '2.0.0', role: 'The connection to the local model through Ollama.' },
      { name: 'jjwt', version: '0.13.0', role: 'Signs and checks the sign-in tokens.' },
      { name: 'OpenPDF', version: '3.0.5', role: 'Writes the PDF report.' },
      { name: 'springdoc-openapi', version: '3.1.0', role: 'Builds the Swagger page from the endpoints.' },
    ],
  },
  {
    heading: 'Front end',
    items: [
      { name: 'React', version: '19.2.8', role: 'Draws every page.' },
      { name: 'React Router', version: '7.18.2', role: 'Moves between pages and guards the ones that need a role.' },
      { name: 'Vite', version: '8.2.0', role: 'Builds and serves the front end.' },
      { name: 'TypeScript', version: '6.0.2', role: 'Typed code for the whole front end.' },
      { name: 'Recharts', version: '3.10.1', role: 'Draws the charts.' },
      { name: 'Axios', version: '1.19.0', role: 'Sends the requests to the API.' },
      { name: 'React Hook Form', version: '7.84.0', role: 'Handles the forms.' },
    ],
  },
  {
    heading: 'Data and model',
    items: [
      { name: 'MySQL', version: '8.4', role: 'Stores accounts, prompts, decisions and the audit trail.' },
      { name: 'Ollama', version: 'latest image', role: 'Runs the AI model on this machine. Which model is a setting.' },
      { name: 'Docker Compose', role: 'Starts the database, the model, the API and the front end together on one machine.' },
    ],
  },
]

export interface Hop {
  title: string
  text: string
}

// What happens to one request, in order.
export const REQUEST_LIFECYCLE: readonly Hop[] = [
  { title: 'Request leaves the browser', text: 'The React page sends the request to the API with the sign-in token in a header. The API accepts requests from one front-end address only.' },
  { title: 'Token check', text: 'A filter reads the token, checks its signature and expiry, then loads the account and its roles from the database on every request.' },
  { title: 'Rate limit', text: 'Prompt submissions are counted per user and sign-in requests per address. Too many in a minute get a 429.' },
  { title: 'Role and body check', text: 'The endpoint states which roles may call it, and the request body is validated before any work starts.' },
  { title: 'Screening', text: 'For a prompt, the service runs the nine-step pipeline and saves the prompt, findings, signals and decision.' },
  { title: 'The model', text: 'An allowed prompt, or one you confirmed, goes to Ollama on the same machine, with a time limit. The reply is checked before it is returned.' },
  { title: 'Response', text: 'The API returns JSON and the page draws it. Errors come back as a status code and a short message that never repeats the prompt.' },
]

export interface TableGroup {
  heading: string
  tables: readonly { name: string; text: string }[]
}

// The tables the back end creates, one line each.
export const TABLE_GROUPS: readonly TableGroup[] = [
  {
    heading: 'Accounts and access',
    tables: [
      { name: 'users', text: 'Each account, its status and its password hash.' },
      { name: 'roles', text: 'The three roles.' },
      { name: 'user_roles', text: 'Which roles each account holds.' },
      { name: 'password_reset_tokens', text: 'One-time reset tokens with an expiry.' },
    ],
  },
  {
    heading: 'Screening',
    tables: [
      { name: 'prompt_requests', text: 'Each submitted prompt, its masked text, its status and the model’s reply.' },
      { name: 'detection_findings', text: 'Each sensitive item found: its type, position and confidence.' },
      { name: 'risk_signals', text: 'Each injection or obfuscation signal recorded.' },
      { name: 'screening_decisions', text: 'The decision, score, five sub-scores, band and rules that applied.' },
    ],
  },
  {
    heading: 'Review',
    tables: [
      { name: 'review_records', text: 'A reviewer’s action on a held prompt, with the reason.' },
    ],
  },
  {
    heading: 'Settings',
    tables: [
      { name: 'system_config', text: 'The policy: thresholds, maximum length, switched-off detectors and retention.' },
      { name: 'org_confidential_terms', text: 'The administrator’s list of confidential terms.' },
      { name: 'approved_models', text: 'The AI models that may be used.' },
    ],
  },
  {
    heading: 'Audit',
    tables: [
      { name: 'audit_events', text: 'Who did what, when, with the risk band and never the prompt.' },
    ],
  },
]

export interface Capability {
  what: string
  user: boolean
  reviewer: boolean
  admin: boolean
}

// What each role can do, from the @PreAuthorize rule on each endpoint.
export const ROLE_MATRIX: readonly Capability[] = [
  { what: 'Screen a prompt, confirm masked text, see their own history and audit trail', user: true, reviewer: true, admin: true },
  { what: 'See the review queue and approve or reject held prompts', user: false, reviewer: true, admin: true },
  { what: 'See today’s summary, the risk distribution and the entity chart', user: false, reviewer: true, admin: true },
  { what: 'See recent blocks, screening time and repeated violations', user: false, reviewer: false, admin: true },
  { what: 'Manage users, policy, confidential terms, models and retention', user: false, reviewer: false, admin: true },
  { what: 'Read the full audit log and export reports', user: false, reviewer: false, admin: true },
]

export const ROLE_MATRIX_NOTE =
  'Roles are separate grants, not a ladder. The first row needs the User role, so an administrator or reviewer who should also screen prompts holds it as well, as the seeded administrator and the demo reviewer do.'

export interface EndpointGroup {
  prefix: string
  who: string
  paths: readonly string[]
}

export const ENDPOINT_GROUPS: readonly EndpointGroup[] = [
  { prefix: '/api/auth', who: 'Anyone', paths: ['register', 'login', 'logout', 'forgot-password', 'reset-password'] },
  { prefix: '/api/prompts', who: 'User', paths: ['submit', '{id}/confirm', 'my-history', '{id}'] },
  { prefix: '/api/review', who: 'Reviewer, Admin', paths: ['queue', '{id}/details', '{id}/decide'] },
  { prefix: '/api/dashboard', who: 'Reviewer, Admin; the rest Admin', paths: ['summary', 'entity-stats', 'risk-distribution', 'recent-blocked', 'processing-time', 'repeated-violations'] },
  { prefix: '/api/audit', who: 'User for their own, Admin for all', paths: ['my-history', 'all'] },
  { prefix: '/api/reports', who: 'Admin', paths: ['export'] },
  { prefix: '/api/admin', who: 'Admin', paths: ['users', 'users/{id}/history', 'users/{id}/enable', 'users/{id}/disable', 'policy', 'org-terms', 'approved-models', 'ollama-status', 'retention'] },
]

export const API_DOCS_PATH = '/swagger-ui.html'

export interface Control {
  title: string
  text: string
}

// Each control was checked against the code before it was written here.
export const SECURITY_CONTROLS: readonly Control[] = [
  { title: 'Password hashing', text: 'Passwords are hashed with BCrypt before they are stored, and a password must be at least 8 characters.' },
  { title: 'Sign-in tokens', text: 'A token is a signed JWT that lasts one hour. The signing secret comes from the environment, and the server keeps no session.' },
  { title: 'Roles on every endpoint', text: 'Each endpoint states the roles that may call it. A request with no valid token gets 401, and one with the wrong role gets 403.' },
  { title: 'Rate limits', text: 'Ten prompt submissions or confirmations a minute for each user, and five sign-in, register or reset requests a minute for each address. The windows are fixed one-minute windows held in memory, and the limits are settings.' },
  { title: 'CORS', text: 'Only the front end’s own address may call the API from a browser, using GET, POST, PUT, DELETE and OPTIONS. Request-forgery protection is switched off, because the session is a token in a header, not a cookie.' },
  { title: 'Validation', text: `Required fields, minimum lengths and the policy’s maximum prompt length (${PIPELINE.defaults.maxPromptLength} characters by default) are checked before any work. Broken JSON and unreadable IDs get 400, and the response never repeats what was sent.` },
  { title: 'Secrets stay out of the code', text: 'The database login, the token secret and the first administrator come from environment settings. The database login has no default.' },
  { title: 'Masked text for reviewers', text: 'A reviewer sees the masked copy of a held prompt. Only when nothing was found to mask is the text shown as written.' },
]
