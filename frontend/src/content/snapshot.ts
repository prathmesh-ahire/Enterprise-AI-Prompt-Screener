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

// A short synthetic sentence run through the detectors: one each detector catches
// ("caught"), a look-alike its second pass rejects ("ignored"), and documented gaps ("missed").
export interface DetectorExample {
  id: string
  entityType: string
  kind: 'caught' | 'ignored' | 'missed'
  text: string
  entityTypes: string[]
  maskedText: string
}

export interface PipelineSnapshot {
  formulaWeights: Record<string, number>
  thresholds: { mask: number; confirm: number; review: number; block: number }
  placeholders: Record<string, string>
  signalTypes: string[]
  subScoreRules: {
    severityPerFinding: Record<string, number>
    secretCriticality: Record<string, number>
    injectionPerPhrase: number
    roleBaseline: Record<string, number>
    lengthShareCap: number
  }
  overrideRules: { rule: string; floor: string; description: string }[]
  defaults: { maxPromptLength: number; retentionDays: number }
  examples: SnapshotExample[]
  orgTermForExamples: string
  detectorExamples: DetectorExample[]
}

export const PIPELINE: PipelineSnapshot = snapshotJson as PipelineSnapshot

// The day the snapshot was last written by the backend test, for its SourceCaption.
export const SNAPSHOT_SOURCE = {
  source: 'pipeline snapshot written by PipelineSnapshotTest',
  date: '2026-10-26',
  kind: 'measured',
} as const

export function snapshotExample(id: string): SnapshotExample {
  const found = PIPELINE.examples.find((e) => e.id === id)
  if (!found) throw new Error(`No snapshot example "${id}"`)
  return found
}

export function detectorExample(id: string): DetectorExample {
  const found = PIPELINE.detectorExamples.find((e) => e.id === id)
  if (!found) throw new Error(`No detector example "${id}"`)
  return found
}

// Severity tier of an entity type, read from the backend's per-finding weight: the heaviest
// weight is critical, the next high, and the rest medium.
const SEVERITY_LEVELS = [...new Set(Object.values(PIPELINE.subScoreRules.severityPerFinding))].sort((a, b) => b - a)

export function severityTier(entityType: string): 'critical' | 'high' | 'medium' {
  const level = SEVERITY_LEVELS.indexOf(PIPELINE.subScoreRules.severityPerFinding[entityType])
  if (level === 0) return 'critical'
  if (level === 1) return 'high'
  return 'medium'
}

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

const scoreFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })
const ruleByName = Object.fromEntries(PIPELINE.overrideRules.map((r) => [r.rule, r]))

// One sentence on how a decision came about: the band the score alone gave, and any rule
// that raised it.
export function decisionSentence(example: SnapshotExample): string {
  const score = scoreFormat.format(example.riskScore)
  if (example.appliedOverrides.length === 0) {
    return `The score of ${score} is in the ${example.scoreBand} band, and no rule changes it.`
  }
  const raised = example.appliedOverrides.map((name) => ruleByName[name].description.replace(/\.$/, '')).join('; ')
  return `The score of ${score} alone would give ${example.scoreBand}. ${raised}: ${example.decision}.`
}
