import type { ReactNode } from 'react'

// todo 56A.7/56A.8 (design.md section 14). The design system's inline line icons: a 24px
// grid, 1.75px stroke, round caps and currentColor, with the SVG paths copied from the
// export's components/*/preview.html. Always shown beside a word, never on their own;
// aria-hidden because the word carries the meaning. `not-sent` and `disabled` are the two
// status shapes the user added (design.md 15b), drawn to the same rules.
const PATHS: Record<string, ReactNode> = {
  check: <path d="M20 6 9 17l-5-5" />,
  'eye-slash': (
    <>
      <path d="m3 3 18 18" />
      <path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5" />
      <path d="M6.6 6.6C4.3 8 2.7 10.2 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.5 4.8-1.3" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
      <path d="M12 17.2v.1" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'slashed-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.7 5.7 12.6 12.6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.8v.1" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5 2.5 20h19L12 3.5z" />
      <path d="M12 10v4" />
      <path d="M12 17.2v.1" />
    </>
  ),
  scales: (
    <>
      <path d="M12 4v16" />
      <path d="M8 20h8" />
      <path d="M5 7h14" />
      <path d="m5 7-3 7a3 3 0 0 0 6 0L5 7z" />
      <path d="m19 7-3 7a3 3 0 0 0 6 0l-3-7z" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5.5 5h13L21 13v6H3v-6l2.5-8z" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9" />
      <path d="m17 6 3 3" />
    </>
  ),
  'status-pending': <circle cx="12" cy="12" r="8" />,
  'status-in-review': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </>
  ),
  'status-done': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  'status-overridden': (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </>
  ),
  'status-live': <circle cx="12" cy="12" r="5" fill="currentColor" />,
  'status-not-sent': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </>
  ),
  'status-disabled': (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12h8" />
    </>
  ),
}

export type IconName = keyof typeof PATHS

export function Icon({ name, small = false }: { name: IconName; small?: boolean }) {
  return (
    <svg
      className={small ? 'ps-ico ps-ico--sm' : 'ps-ico'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
