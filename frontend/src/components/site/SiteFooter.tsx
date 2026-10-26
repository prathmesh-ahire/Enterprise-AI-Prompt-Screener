import { Link } from 'react-router-dom'
import {
  FOOTER_DESCRIPTION, FOOTER_GROUPS, OFFLINE_STATEMENT, PRODUCT_NAME, WORDMARK,
} from '../../content/site'

// The public footer: the wordmark with a one-sentence description, three groups of links,
// and a base line carrying the full product name and the offline statement. It shows no
// version number.
export function SiteFooter() {
  return (
    <footer className="ps-site-foot">
      <div>
        <Link to="/" className="ps-wordmark">{WORDMARK}</Link>
        <p className="ps-site-foot__lede">{FOOTER_DESCRIPTION}</p>
      </div>
      {FOOTER_GROUPS.map((group) => (
        <div key={group.heading}>
          <h2 className="ps-site-foot__h">{group.heading}</h2>
          <ul>
            {group.links.map((link) => (
              <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
            ))}
          </ul>
        </div>
      ))}
      <div className="ps-site-foot__base">
        <span>{PRODUCT_NAME}</span>
        <span>{OFFLINE_STATEMENT}</span>
      </div>
    </footer>
  )
}
