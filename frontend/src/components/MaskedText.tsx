const PLACEHOLDER_PATTERN = /(\[[A-Z_]+\])/g

// todo.md Phase 26.4 - renders masked text with its [PLACEHOLDER] tokens highlighted.
// Plain text nodes only (React's default escaping) - never dangerouslySetInnerHTML, since
// the underlying text is attacker-controlled and stored. Reused by History (28.3) and
// Review Queue (29.2), which also need to show masked prompts.
export function MaskedText({ text }: { text: string }) {
  // String.split with a capturing group interleaves matches at odd indices.
  const parts = text.split(PLACEHOLDER_PATTERN)

  return (
    <p className="masked-text">
      {parts.map((part, i) =>
        i % 2 === 1
          ? <span key={i} className="placeholder-chip">{part}</span>
          : <span key={i}>{part}</span>,
      )}
    </p>
  )
}
