import { bandRanges, type BandRange, type DecisionName, PIPELINE } from '../../content/snapshot'

// The five score bands as a strip of solid decision colours, with the decision's name and
// its range under each segment. Public pages only: it shows the DEFAULT policy, with the
// ranges taken from the pipeline snapshot - never typed in, and never shown inside the app,
// where an admin's thresholds can differ. Column widths follow the ranges, so each segment
// is as wide as its band. The labels carry the meaning; colour alone never does.
const NAME: Record<DecisionName, string> = {
  ALLOW: 'Allow', MASK: 'Mask', CONFIRM: 'Confirm', REVIEW: 'Review', BLOCK: 'Block',
}

const rangeText = (b: BandRange) => `${b.from}–${b.to}`

interface BandStripProps {
  ranges?: BandRange[]
  marker?: number
}

export function BandStrip({ ranges = bandRanges(PIPELINE.thresholds), marker }: BandStripProps) {
  const columns = ranges.map((b) => `${b.to - b.from + 1}fr`).join(' ')
  const description = ranges.map((b) => `${b.decision} ${b.from} to ${b.to}`).join(', ')
  const label = marker === undefined
    ? `Score bands: ${description}`
    : `Score ${marker}, in the ${ranges.find((b) => marker >= b.from && marker <= b.to)?.decision ?? ''} band. Score bands: ${description}`
  return (
    <div className={`ps-bands${marker === undefined ? '' : ' ps-bands--marked'}`} role="img" aria-label={label}>
      <div className="ps-bands__bar" style={{ gridTemplateColumns: columns }}>
        {ranges.map((b) => <i key={b.decision} className={`ps-bands__seg bg-${b.decision.toLowerCase()}`} />)}
        {marker !== undefined && <span className="ps-bands__marker" style={{ left: `calc(${marker} / 101 * 100%)` }} />}
      </div>
      <div className="ps-bands__labels" style={{ gridTemplateColumns: columns }}>
        {ranges.map((b) => (
          <span key={b.decision} className="ps-bands__lab">
            <span className={`ps-bands__name c-${b.decision.toLowerCase()}`}>{NAME[b.decision]}</span>
            <span className="ps-bands__range">{rangeText(b)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
