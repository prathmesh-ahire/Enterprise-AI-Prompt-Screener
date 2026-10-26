import type { ReactNode } from 'react'
import type { Figure } from '../content/site'
import { FigureCaption, NotMeasuredCaption } from './SourceCaption'

// One number, what it counts, and where it came from. Inside .ps-public it is the large
// figure on a rule with no box; in the app it is the 30px figure in a bordered tile - the
// markup is the same.
//
// A number that has not been measured shows "—" and "Not yet measured", never a placeholder
// figure. A tile always carries a source, so `figure` (the content module's entry, which
// holds the value, source and date) is the normal way in; `caption` replaces the source line
// where a panel states one caption for all its tiles instead.
interface MetricTileProps {
  figure?: Figure | null
  label?: string
  unit?: string
  value?: ReactNode
  caption?: ReactNode
  to?: string
}

export function MetricTile({ figure, label, unit, value, caption, to }: MetricTileProps) {
  const shown = value ?? figure?.value ?? null
  const measured = shown !== null && shown !== ''
  let source: ReactNode = caption
  if (!measured) source = <NotMeasuredCaption />
  else if (!caption && figure) source = <FigureCaption figure={figure} to={to} />
  return (
    <div className="ps-metric">
      <span className={`ps-metric__value ps-num${measured ? '' : ' ps-metric__value--empty'}`}>
        {measured ? <>{shown}{unit && <small>{unit}</small>}</> : '—'}
      </span>
      <span className="ps-metric__label">{label ?? figure?.label}</span>
      {source}
    </div>
  )
}
