import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

// Real ARIA tabs in the underline style of the navbar's current-page bar. Only the selected
// tab is in the tab order; Left and Right move between tabs (wrapping), Home and End jump to
// the ends, and moving to a tab selects it. Every panel stays in the page, hidden until its
// tab is chosen, so each tab's aria-controls points at something real. Used in the app and on
// the public pages alike.
export interface TabItem {
  id: string
  label: string
  panel: ReactNode
}

interface TabsProps {
  label: string
  tabs: TabItem[]
  initial?: string
}

export function Tabs({ label, tabs, initial }: TabsProps) {
  const base = useId()
  const [selected, setSelected] = useState(initial ?? tabs[0]?.id)
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({})

  const move = (index: number) => {
    const target = tabs[(index + tabs.length) % tabs.length]
    setSelected(target.id)
    buttons.current[target.id]?.focus()
  }

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') move(index + 1)
    else if (e.key === 'ArrowLeft') move(index - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(tabs.length - 1)
    else return
    e.preventDefault()
  }

  return (
    <div className="ps-tabs">
      <div className="ps-tabs__list" role="tablist" aria-label={label}>
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${base}-tab-${tab.id}`}
            className="ps-tab"
            aria-selected={tab.id === selected}
            aria-controls={`${base}-panel-${tab.id}`}
            tabIndex={tab.id === selected ? 0 : -1}
            ref={(el) => { buttons.current[tab.id] = el }}
            onClick={() => setSelected(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          className="ps-tabs__panel"
          hidden={tab.id !== selected}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  )
}
