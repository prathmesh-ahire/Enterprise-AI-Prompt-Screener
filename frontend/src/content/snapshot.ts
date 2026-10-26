import snapshotJson from './pipeline-snapshot.json'

// Typed access to the backend-generated pipeline snapshot. The public pages read the
// default thresholds, formula weights and real screening examples from here, never from
// numbers typed into a page; a backend test fails when the file drifts from the pipeline.
export interface SnapshotExample {
  id: string
  text: string
  decision: string
  scoreBand: string
  appliedOverrides: string[]
  subScores: Record<string, number>
  riskScore: number
  entityTypes: string[]
  maskedText: string
}

export interface PipelineSnapshot {
  formulaWeights: Record<string, number>
  thresholds: { mask: number; confirm: number; review: number; block: number }
  placeholders: Record<string, string>
  signalTypes: string[]
  examples: SnapshotExample[]
}

export const PIPELINE: PipelineSnapshot = snapshotJson as PipelineSnapshot

export const DECISIONS = ['ALLOW', 'MASK', 'CONFIRM', 'REVIEW', 'BLOCK'] as const
export type DecisionName = (typeof DECISIONS)[number]

export interface BandRange {
  decision: DecisionName
  from: number
  to: number
}

// The five score bands from a set of thresholds: each band runs from its own lower edge to
// one below the next band's, and BLOCK runs to 100. The default policy's thresholds come
// from the snapshot, so a band edge is never typed into a page.
export function bandRanges(thresholds: PipelineSnapshot['thresholds'] = PIPELINE.thresholds): BandRange[] {
  const edges = [0, thresholds.mask, thresholds.confirm, thresholds.review, thresholds.block, 101]
  return DECISIONS.map((decision, i) => ({ decision, from: edges[i], to: edges[i + 1] - 1 }))
}
