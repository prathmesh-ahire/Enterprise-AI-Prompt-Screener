import { useEffect, useState } from 'react'

// A sticky "On this page" list that sits to the left of the content column. The section in
// view is marked with the brighter text, a thin brand bar beside it and aria-current, so
// the state is never colour alone; it follows the scroll with no animation. Each entry links
// to a section's anchor id (the SectionHeader's `id`).
export interface TocItem {
  id: string
  label: string
}

// A section counts as current while it crosses the band below the sticky header and above
// the lower half of the screen.
const BAND_TOP = 96
const OBSERVE_BAND = `-${BAND_TOP}px 0px -55% 0px`

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [current, setCurrent] = useState(items[0]?.id)

  useEffect(() => {
    const inView = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inView.add(entry.target.id)
          else inView.delete(entry.target.id)
        }
        // The first listed section in view wins; between sections the last one stays current,
        // except above the first section, where the first entry is current.
        const first = items.find((item) => inView.has(item.id))
        if (first) setCurrent(first.id)
        else if ((document.getElementById(items[0].id)?.getBoundingClientRect().top ?? 0) > BAND_TOP) setCurrent(items[0].id)
      },
      { rootMargin: OBSERVE_BAND },
    )
    for (const item of items) {
      const section = document.getElementById(item.id)
      if (section) observer.observe(section)
    }
    return () => observer.disconnect()
  }, [items])

  return (
    <nav className="ps-toc" aria-label="On this page">
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} aria-current={item.id === current ? 'location' : undefined}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
