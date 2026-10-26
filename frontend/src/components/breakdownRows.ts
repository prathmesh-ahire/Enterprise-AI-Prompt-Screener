import type { ScoreBreakdown as ScoreBreakdownDto } from '../api/types'
import { PIPELINE, type SnapshotExample } from '../content/snapshot'

// The rows a ScoreBreakdown shows, built from the API's breakdown in the app and from the
// pipeline snapshot on the public pages. Names and weights are read, never typed.
export interface BreakdownRow {
  key: string
  label: string
  score: number
  weight: number
}

// "SENSITIVE_DATA" (API) and "sensitiveData" (snapshot) both become "Sensitive data".
export function breakdownLabel(name: string): string {
  const words = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function rowsFromDto(breakdown: ScoreBreakdownDto): BreakdownRow[] {
  return breakdown.components.map((c) => ({
    key: c.name, label: breakdownLabel(c.name), score: c.subScore, weight: c.weight,
  }))
}

export function rowsFromSnapshot(example: SnapshotExample): BreakdownRow[] {
  return Object.entries(example.subScores).map(([name, score]) => ({
    key: name, label: breakdownLabel(name), score, weight: PIPELINE.formulaWeights[name],
  }))
}
