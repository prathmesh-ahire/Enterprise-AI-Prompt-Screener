// How each detector works, in words, for the Home and Detectors pages. The wording follows
// the detector classes in the backend (pass 1 finds candidates, pass 2 rejects look-alikes);
// the examples, placeholders and severity tiers are read from the pipeline snapshot.

// The entity type's name as it reads inside a sentence, keeping the capitals of PAN, API
// and Aadhaar.
const INLINE_LABELS: Record<string, string> = {
  PERSONAL_EMAIL: 'email address',
  PHONE_NUMBER: 'phone number',
  PAYMENT_CARD: 'payment card',
  PAN_LIKE_ID: 'PAN number',
  AADHAAR_LIKE_ID: 'Aadhaar number',
  API_KEY: 'API key',
  PASSWORD_SECRET: 'password',
  PRIVATE_KEY: 'private key',
  ORG_CONFIDENTIAL: 'confidential term',
}

export const inlineLabel = (type: string) => INLINE_LABELS[type] ?? type.toLowerCase().replace(/_/g, ' ')

export interface DetectorGroup {
  id: string
  label: string
  types: string[]
}

export const DETECTOR_GROUPS: readonly DetectorGroup[] = [
  { id: 'personal', label: 'Personal', types: ['PERSONAL_EMAIL', 'PHONE_NUMBER'] },
  { id: 'financial', label: 'Financial', types: ['PAYMENT_CARD'] },
  { id: 'government', label: 'Government ID', types: ['PAN_LIKE_ID', 'AADHAAR_LIKE_ID'] },
  { id: 'credentials', label: 'Credentials', types: ['API_KEY', 'PASSWORD_SECRET', 'PRIVATE_KEY'] },
  { id: 'organisation', label: 'Organisation', types: ['ORG_CONFIDENTIAL'] },
]

export interface DetectorInfo {
  type: string
  pass1: string
  pass2: string
  caught: string
  ignored: string
}

export const DETECTORS: readonly DetectorInfo[] = [
  {
    type: 'PERSONAL_EMAIL',
    pass1: 'Anything shaped like an email address: a name, an @ and a domain.',
    pass2: 'Every part of the domain must be a valid host name and the ending a valid top-level domain.',
    caught: 'email-caught',
    ignored: 'email-ignored',
  },
  {
    type: 'PHONE_NUMBER',
    pass1: 'An Indian mobile number: ten digits starting with 6 to 9, with an optional +91 or 0 in front and spaces or hyphens between the groups.',
    pass2: 'The number must stand on its own, not sit inside a longer run of digits or letters, for example part of a card number or an ID.',
    caught: 'phone-caught',
    ignored: 'phone-ignored',
  },
  {
    type: 'PAYMENT_CARD',
    pass1: 'A run of 13 to 19 digits, allowing single spaces or hyphens between them.',
    pass2: 'The Luhn check digit must be right, and the number must start with a real card issuer prefix at a length that issuer uses.',
    caught: 'card-caught',
    ignored: 'card-ignored',
  },
  {
    type: 'PAN_LIKE_ID',
    pass1: 'Five letters, four digits and a letter, in any case.',
    pass2: 'The fourth letter must be one of the real PAN holder codes. PAN has no public checksum, so this is a format check only.',
    caught: 'pan-caught',
    ignored: 'pan-ignored',
  },
  {
    type: 'AADHAAR_LIKE_ID',
    pass1: 'Twelve digits starting with 2 to 9, optionally grouped in fours.',
    pass2: 'The Verhoeff check digit, the algorithm Aadhaar numbers use, must be right.',
    caught: 'aadhaar-caught',
    ignored: 'aadhaar-ignored',
  },
  {
    type: 'API_KEY',
    pass1: 'A key-shaped token near a word such as key, token, secret, bearer or credential, on either side; or a token that starts with a well-known issuer prefix, with no keyword needed.',
    pass2: 'The token must look random enough to be a secret: its Shannon entropy must be at least 3.5 bits per character. A token with slashes must also mix upper case, lower case and digits and must not read as a web address or file path.',
    caught: 'apikey-caught',
    ignored: 'apikey-ignored',
  },
  {
    type: 'PASSWORD_SECRET',
    pass1: 'A word such as password, passphrase, passcode or pwd, and the words near it on either side in the same sentence.',
    pass2: 'A nearby word must look like secret material: long enough and mixing upper case, lower case, digits or symbols, and not a placeholder, address, date or common word.',
    caught: 'password-caught',
    ignored: 'password-ignored',
  },
  {
    type: 'PRIVATE_KEY',
    pass1: 'A complete BEGIN … PRIVATE KEY … END block.',
    pass2: 'The text between the two lines must actually be key material, not a placeholder such as "your key here".',
    caught: 'privatekey-caught',
    ignored: 'privatekey-ignored',
  },
  {
    type: 'ORG_CONFIDENTIAL',
    pass1: 'A term an administrator has added to the confidential list, matched as whole words in any case.',
    pass2: 'None needed: the administrator chose the term, so a whole-word match is the finding.',
    caught: 'org-caught',
    ignored: 'org-ignored',
  },
]

// The seven risk signals, described by what they look for rather than the phrases they match.
export const SIGNALS: readonly { type: string; label: string; text: string }[] = [
  { type: 'INSTRUCTION_OVERRIDE', label: 'Instruction override', text: 'The prompt tells the model to ignore, forget or disregard the instructions it was given.' },
  { type: 'SYSTEM_PROMPT_DISCLOSURE', label: 'System prompt disclosure', text: 'The prompt asks the model to repeat or reveal the hidden instructions it runs under.' },
  { type: 'POLICY_BYPASS', label: 'Policy bypass', text: 'The prompt asks the model to act as if it had no restrictions, or to switch its filters off.' },
  { type: 'SECRET_EXTRACTION', label: 'Secret extraction', text: 'The prompt asks the model to hand over a key, a password or other credentials.' },
  { type: 'SUSPICIOUS_ROLE_PLAY', label: 'Suspicious role play', text: 'The prompt casts the model as an unrestricted system or as someone with special access.' },
  { type: 'OBFUSCATION_SIGNAL', label: 'Obfuscation', text: 'The text hides words: long base64-looking blocks, invisible zero-width characters, letters spaced apart or heavy number-for-letter swaps.' },
  { type: 'REPEATED_ATTACK_PATTERN', label: 'Repeated attempts', text: 'The same user has had several prompts blocked or sent for review in a short time.' },
]
