import { Link } from 'react-router-dom'
import type { Figure } from '../content/site'

// Two captions, one look. A number on a public page carries the first: where it came from
// and the day it was measured or recorded, with the two kinds told apart in words, never by
// colour. A panel of live app numbers carries the second.
//
//   Source: <what> · measured|recorded <YYYY-MM-DD>
//   Source: this system's screening records · <window> · updated <HH:MM>
//
// `to` makes the source a link to the page that explains it.
interface SourceCaptionProps {
  source: string
  date: string
  kind: Figure['kind']
  to?: string
}

export function SourceCaption({ source, date, kind, to }: SourceCaptionProps) {
  return (
    <p className="ps-source">
      Source: {to ? <Link to={to}>{source}</Link> : source} · {kind} {date}
    </p>
  )
}

// The caption of a figure from the content module.
export function FigureCaption({ figure, to }: { figure: Figure; to?: string }) {
  return <SourceCaption source={figure.source} date={figure.date} kind={figure.kind} to={to} />
}

// What a tile shows in place of a source when nothing has been measured.
export function NotMeasuredCaption() {
  return <p className="ps-source">Not yet measured</p>
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function LiveSourceCaption({ window, updatedAt }: { window: string; updatedAt: Date | null }) {
  return (
    <p className="ps-source">
      Source: this system&apos;s screening records · {window}
      {updatedAt && <> · updated {formatTime(updatedAt)}</>}
    </p>
  )
}
