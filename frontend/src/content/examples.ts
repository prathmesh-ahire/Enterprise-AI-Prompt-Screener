import { entityLabel } from '../components/EntityChips'
import { snapshotExample, type SnapshotExample } from './snapshot'

// A plain name for a snapshot example, from what the pipeline found in it.
export function exampleTitle(example: SnapshotExample): string {
  if (example.entityTypes.length > 0) return example.entityTypes.map(entityLabel).join(' and ')
  if (example.appliedOverrides.includes('INJECTION_SIGNAL')) return 'Instruction override attempt'
  return 'Nothing sensitive'
}

// The synthetic prompts offered as one-click examples on the Prompt page: one that is
// harmless and one for each of the main outcomes.
const PROMPT_EXAMPLE_IDS = ['safe-1', 'email-1', 'combined-1', 'apikey-1', 'injection-1']

export const PROMPT_EXAMPLES: readonly SnapshotExample[] = PROMPT_EXAMPLE_IDS.map(snapshotExample)
