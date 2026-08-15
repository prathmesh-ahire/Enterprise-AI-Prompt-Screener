// todo.md Phase 45.7. The spinner is always paired with text rather than standing alone,
// so "busy" survives prefers-reduced-motion (where the animation is slowed right down)
// and reads correctly to a screen reader via role="status". Phase 46.4 turns this into
// the shared page-level loading state; this is the inline form.
export function InlineLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <span className="loading-inline" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </span>
  )
}
