const PLACEHOLDER_PATTERN = /(\[[A-Z_]+\])/g

// todo.md Phase 26.4, on the design's code box (56A.7): masked text is shown in the `code`
// style on surface-selected, with its [PLACEHOLDER] tokens lifted to text-primary. Plain
// text nodes only (React's default escaping) - never dangerouslySetInnerHTML, since the
// underlying text is attacker-controlled and stored. Reused by History and Review Queue.
export function MaskedText({ text }: { text: string }) {
  const parts = text.split(PLACEHOLDER_PATTERN)
  return (
    <p className="ps-codebox">
      {parts.map((part, i) =>
        i % 2 === 1
          ? <span key={i} className="ps-codebox__placeholder">{part}</span>
          : <span key={i}>{part}</span>,
      )}
    </p>
  )
}
