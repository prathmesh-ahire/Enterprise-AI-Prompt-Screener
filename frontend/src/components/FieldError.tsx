import { Icon } from './Icon'

// A field's error is `.ps-help--error` with a
// warning icon and a sentence on how to fix it. The control points at it with
// aria-describedby and carries aria-invalid, so colour is never the only signal.
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="ps-help ps-help--error">
      <Icon name="warning" />
      <span>{message}</span>
    </p>
  )
}
