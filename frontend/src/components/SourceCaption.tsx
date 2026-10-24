// todo 56A.7 (design.md section 15b, "Live-number captions"). One caption per panel of
// live numbers: "Source: this system's screening records · <window> · updated <HH:MM>".
// The window states what the numbers cover; the time says when they were last loaded.
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function LiveSourceCaption({ window, updatedAt }: { window: string; updatedAt: Date | null }) {
  return (
    <p className="ps-source">
      Source: this system&apos;s screening records · {window}
      {updatedAt && <> · updated {formatTime(updatedAt)}</>}
    </p>
  )
}
