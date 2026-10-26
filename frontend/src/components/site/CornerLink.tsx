import { Link } from 'react-router-dom'

// The public secondary action: a white label inside four corner brackets, with a light
// streak that crosses on hover. Public pages only; the app's secondary button is outlined.
// The extra spans are decoration, so they are hidden from assistive technology.
export function CornerLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className="ps-btn ps-btn--corner">
      <span className="ps-btn__label">{children}</span>
      <span className="ps-btn__shine" aria-hidden="true" />
      <span className="ps-btn__c ps-btn__c--tl" aria-hidden="true" />
      <span className="ps-btn__c ps-btn__c--tr" aria-hidden="true" />
      <span className="ps-btn__c ps-btn__c--bl" aria-hidden="true" />
      <span className="ps-btn__c ps-btn__c--br" aria-hidden="true" />
    </Link>
  )
}
