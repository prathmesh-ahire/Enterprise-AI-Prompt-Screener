import { FIGURES, type Figure } from './site'
import { PIPELINE } from './snapshot'

// What the screener does not do, the trade-offs kept on purpose and the defects found and
// fixed. Each item that quotes a figure carries the source and the day it was recorded.

interface Sourced {
  source: string
  date: string
  kind: Figure['kind']
}

export interface LimitItem {
  title: string
  text: string
  // The recorded result behind a figure in the text, when there is one.
  evidence?: Sourced
}

// Gaps in what the detectors find today.
export const DETECTION_GAPS: readonly LimitItem[] = [
  {
    title: 'Names of people',
    text: 'None of the nine detectors recognises a person’s name. Telling a name from an ordinary word needs a language model, and this screener is rule-based.',
  },
  {
    title: 'Passwords with no keyword',
    text: 'A password is found by the word near it, such as “password” or “passcode”. In the public dataset audit, 852 of the 2,601 passwords sat in prompts with no such word anywhere, which rules cannot find.',
    evidence: { source: 'Public dataset audit, English file of 43,501 rows', date: '2026-08-16', kind: 'recorded' },
  },
  {
    title: 'Injection in other words',
    text: 'The injection checks match known phrasings as exact text. The same request in words the lists do not hold is not recognised.',
  },
  {
    title: 'Some signals never escalate alone',
    text: 'Of the seven risk signals, only an instruction override or a policy bypass sends a prompt to a reviewer. Asking for the hidden instructions, for example, is recorded and adds to the score, but it does not force a review. Whether it should is still open.',
  },
  {
    title: 'Phone numbers with dots',
    text: 'A number written as 98765.43210 is not caught. Allowing a dot could also match decimal numbers, and no harmless test set was left to show it would not.',
  },
  {
    title: 'Two base64-style keys',
    text: 'Two keys in the base64 test set are missed: one with more slashes than the detector allows and one that begins with a slash. Loosening the rule would flag ordinary web addresses and file paths.',
    evidence: { source: 'ApiKeyBase64CorpusTest, base64-secret-corpus.txt', date: '2026-10-09', kind: 'recorded' },
  },
  {
    title: 'Public SSH keys',
    text: 'A line beginning ssh-rsa holds a public key, which is not a secret, so it is deliberately not flagged.',
  },
]

// Behaviour kept on purpose, and the reason it was kept.
export const TRADE_OFFS: readonly LimitItem[] = [
  {
    title: 'The sign-in token lives in the browser’s local storage',
    text: 'A script injected into the page could read it. This is accepted for an academic prototype. A token lasts one hour.',
  },
  {
    title: 'The password reset token is printed to the console',
    text: 'There is no email service, so the token is logged. It is the one place the system writes a sensitive value to a log.',
  },
  {
    title: 'Prompts are stored as written',
    text: `The raw text of every prompt is kept so a reviewer can be shown a masked copy and a decision can be explained later. Two controls compensate: no endpoint returns the raw text when a masked version exists, and a daily job deletes old rows, after ${PIPELINE.defaults.retentionDays} days unless an administrator changes it.`,
  },
  {
    title: 'The audit log does not say what changed',
    text: 'An audit event records who did what, when, and the risk band, with no detail column. Saving the policy is logged, but not which value was changed.',
  },
  {
    title: 'A disabled account sees the same error as a wrong password',
    text: 'Signing in to a disabled account returns 401, not 403, so the response does not reveal the state of the account.',
  },
  {
    title: 'Two overlapping findings can garble a placeholder',
    text: 'When two findings truly overlap, the masked text can contain a mangled placeholder. The real fix belongs in the step that resolves overlaps, and it is left for later.',
  },
  {
    title: 'A timed-out AI call keeps running',
    text: 'When the model takes too long the screener stops waiting, but the request itself is not cancelled, so the next call queues behind it. With one local model this was accepted.',
  },
]

// Where this project differs from the document it started from.
export const DEVIATIONS: readonly LimitItem[] = [
  {
    title: 'The band split at 65',
    text: 'The source document says only that a high score means confirm or review. Splitting that range between the two bands is this project’s own choice.',
  },
  {
    title: 'Raw text is stored',
    text: 'The source document leans towards keeping raw prompt text only briefly in memory. This project stores it, with the controls above.',
  },
  {
    title: 'No detector for names',
    text: 'The source document’s example replaces a customer’s name with a placeholder. None of the nine detectors finds names.',
  },
]

export interface Defect {
  date: string
  title: string
  text: string
}

// Real defects found and fixed, oldest first. Each date is the day the project's log
// recorded the problem as fixed.
export const DEFECT_TIMELINE: readonly Defect[] = [
  { date: '2026-08-03', title: 'Signed-out requests were refused with 403', text: 'They now get 401 with a plain JSON message.' },
  { date: '2026-08-03', title: 'An unknown address returned an error 500', text: 'It now returns 404, and a real server error is logged.' },
  { date: '2026-08-05', title: 'An API key was missed when its word was part of a longer name', text: 'A word-boundary rule could not fire inside a name such as test_api_key, and a short value fell under the minimum length. Both were fixed.' },
  { date: '2026-08-07', title: 'A full code audit found seven defects', text: 'A prompt that needed masking but had no findings was stranded and failed on confirm; admins and reviewers were refused on Prompt and History; a failed AI call could not be retried; two parts disagreed on a user’s role; the rate-limit table never shrank; a failed approval lost its review record; and one bad setting value broke every submission. All seven were fixed.' },
  { date: '2026-08-11', title: 'Malformed requests returned 500', text: 'Broken JSON now returns 400 and a missing content type 415. Neither response repeats what was sent, because it could contain prompt text.' },
  { date: '2026-08-12', title: 'An unreadable ID in an address returned 500', text: 'It now returns 400 and names the parameter, never its value.' },
  { date: '2026-08-12', title: 'Four smaller defects from testing', text: 'A masked prompt with no masked text got stuck; the report summary left out CONFIRM; violations were shown by user ID; and the policy number fields put a 0 back after being cleared.' },
  { date: '2026-08-15', title: 'Five lists came back in no fixed order', text: 'History arrived oldest first and new indexes could reorder pages. Every list now declares its order.' },
  { date: '2026-08-15', title: 'Navigation defects after the restyle', text: 'Two admin links lit up at once, the sign-in pages did not link to each other, and the review buttons gave no hint that a reason was needed.' },
  { date: '2026-08-16', title: 'The password detector found 2 of 16 phrasings', text: 'It was rebuilt as a proximity scan with a real second pass. It now finds all 16 and rejects all 21 sentences that only mention a password.' },
  { date: '2026-08-16', title: 'Detected data could still be sent on', text: 'In a recall audit, 31 of the 53 prompts carrying a real secret reached the model with the secret intact: 14 were missed entirely, and 17 were detected but allowed because a lone finding scored too low. More patterns were added, and anything detected is now masked at least.' },
  { date: '2026-08-16', title: 'Phone IMEI numbers were read as payment cards', text: `A card number now needs a real issuer prefix as well as a correct check digit, which removed ${FIGURES.imeiRemoved.value} false alarms with no loss of recall.` },
  { date: '2026-09-22', title: 'Four defects from the 541-item manual test', text: 'A tampered sign-in token was accepted on reload; a password written before its keyword was missed; the risk-signal table kept a fragment of the prompt; and a confidential term could be added twice.' },
  { date: '2026-09-22', title: 'Times were shown five and a half hours behind', text: 'The containers ran in UTC. They now run on India Standard Time.' },
  { date: '2026-10-09', title: 'Base64-style secrets were missed', text: `Keys containing a slash or a plus sign, such as an AWS secret access key, were allowed through. A separate shape for them now catches ${FIGURES.base64Caught.value} of 145 in the test set with no false alarm on 202 harmless lines.` },
]
