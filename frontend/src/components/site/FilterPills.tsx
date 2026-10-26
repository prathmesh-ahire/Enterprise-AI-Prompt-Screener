import type { ReactNode } from 'react'
import { Icon } from '../Icon'

// A row of pill buttons that narrows a list, one choice at a time. The chosen pill is filled
// and carries a check before its label, so the state is never colour alone. Filters are never
// coloured by decision; the one exception is a pill whose label is a small DecisionBadge,
// passed in as `label`.
export interface FilterOption {
  value: string
  label: ReactNode
}

interface FilterPillsProps {
  groupLabel: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

export function FilterPills({ groupLabel, options, value, onChange }: FilterPillsProps) {
  return (
    <div className="ps-filters" role="group" aria-label={groupLabel}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            className="ps-pill"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
          >
            {selected && <Icon name="check" small />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
