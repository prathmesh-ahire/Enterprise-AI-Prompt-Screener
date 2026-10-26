import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

// A short aside of one or two sentences, capped at the reading width. The kind word on top
// carries the meaning (the icon and border are extra), and a callout never shows a decision.
// "honesty" is for stating a limit plainly: Limitations and Evaluation.
type CalloutKind = 'note' | 'caution' | 'honesty'

const KIND: Record<CalloutKind, { word: string; icon: IconName }> = {
  note: { word: 'Note', icon: 'info' },
  caution: { word: 'Caution', icon: 'warning' },
  honesty: { word: 'Honesty', icon: 'scales' },
}

export function Callout({ kind = 'note', children }: { kind?: CalloutKind; children: ReactNode }) {
  const { word, icon } = KIND[kind]
  return (
    <aside className={`ps-callout ps-callout--${kind}`}>
      <span className="ps-callout__kind">
        <Icon name={icon} small />
        {word}
      </span>
      <p className="ps-callout__body">{children}</p>
    </aside>
  )
}
