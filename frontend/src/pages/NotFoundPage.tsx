import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { NOT_FOUND } from '../content/site'

// Shown for any address that is not a page. It sits in the public shell with no moving
// background, because it is not one of the seven content pages. The title is the page's h1,
// set in the empty-state style, with one secondary action.
export function NotFoundPage() {
  return (
    <div className="public-page">
      <div className="ps-empty">
        <span className="ps-empty__icon" aria-hidden="true">
          <Icon name="question" />
        </span>
        <h1 className="ps-empty__title">{NOT_FOUND.title}</h1>
        <p className="ps-empty__text">{NOT_FOUND.text}</p>
        <Link to="/" className="ps-btn ps-btn--secondary">{NOT_FOUND.action}</Link>
      </div>
    </div>
  )
}
