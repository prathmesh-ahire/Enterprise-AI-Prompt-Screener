import { Link } from 'react-router-dom'
import { CornerLink } from './CornerLink'

// The one hero of a public page: a dark oval behind the text so the headline stays readable
// over the moving background, the headline in the display size (shimmering, at most 18
// characters to a line), one lead line, and two actions in sentence case - the glow button
// and the corner button. There is no eyebrow pill and no arc. Put it inside ColorBendsZone.
interface Action {
  label: string
  to: string
}

interface HeroGlowProps {
  title: string
  lead: string
  primary: Action
  secondary: Action
}

export function HeroGlow({ title, lead, primary, secondary }: HeroGlowProps) {
  return (
    <section className="ps-hero">
      <h1 className="ps-hero__title"><span className="ps-shimmer">{title}</span></h1>
      <p className="ps-hero__lead">{lead}</p>
      <div className="ps-hero__actions">
        <Link to={primary.to} className="ps-btn ps-btn--primary">{primary.label}</Link>
        <CornerLink to={secondary.to}>{secondary.label}</CornerLink>
      </div>
    </section>
  )
}
