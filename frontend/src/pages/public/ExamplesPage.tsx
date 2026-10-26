import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Callout } from '../../components/Callout'
import { DecisionBadge } from '../../components/DecisionBadge'
import { EntityChips } from '../../components/EntityChips'
import { MaskedText } from '../../components/MaskedText'
import { RiskScoreBar } from '../../components/RiskScoreBar'
import { ScoreBreakdown } from '../../components/ScoreBreakdown'
import { rowsFromSnapshot } from '../../components/breakdownRows'
import { SourceCaption } from '../../components/SourceCaption'
import { ContentPage } from '../../components/site/ContentPage'
import { FilterPills } from '../../components/site/FilterPills'
import { Section } from '../../components/site/Section'
import { exampleTitle } from '../../content/examples'
import { APP_ENTRY_PATH } from '../../content/site'
import {
  DECISIONS, decisionSentence, PIPELINE, SNAPSHOT_SOURCE, type SnapshotExample,
} from '../../content/snapshot'

const TOC = [
  { id: 'results', label: 'The results' },
  { id: 'try', label: 'Try your own' },
]

const examples = PIPELINE.examples

// Only decisions that have an example get a pill, so no pill ever shows an empty list.
const shownDecisions = DECISIONS.filter((d) => examples.some((e) => e.decision === d))
const missingDecisions = DECISIONS.filter((d) => !shownDecisions.includes(d))

const FILTERS = [
  { value: 'all', label: 'All' },
  ...shownDecisions.map((d) => ({ value: d, label: <DecisionBadge decision={d} /> })),
]

function ExampleCard({ example }: { example: SnapshotExample }) {
  const changed = example.maskedText !== example.text
  return (
    <article className="ps-card">
      <div className="ps-row">
        <h3 className="ps-card__title">{exampleTitle(example)}</h3>
        <DecisionBadge decision={example.decision} />
      </div>
      <div className="ps-split">
        <div className="ps-stack ps-example">
          <span className="ps-label">Synthetic prompt</span>
          <pre className="ps-codebox">{example.text}</pre>
        </div>
        <div className="ps-stack ps-example">
          <span className="ps-label">Masked output</span>
          {changed ? <MaskedText text={example.maskedText} /> : <p className="ps-help">Unchanged: nothing was found to replace.</p>}
        </div>
      </div>
      <RiskScoreBar score={example.riskScore} band={example.scoreBand} decision={example.decision} />
      <EntityChips entityTypes={example.entityTypes} />
      <ScoreBreakdown
        rows={rowsFromSnapshot(example)}
        total={example.riskScore}
        decision={example.decision}
        caption={`Score breakdown: ${exampleTitle(example).toLowerCase()}`}
      />
      <p className="ps-card__text">{decisionSentence(example)}</p>
    </article>
  )
}

export function ExamplesPage() {
  const [decision, setDecision] = useState('all')
  const shown = decision === 'all' ? examples : examples.filter((e) => e.decision === decision)

  return (
    <ContentPage
      title="Real results"
      lead="Each prompt below was run through the actual screening pipeline, and the decision is exactly what it returned."
      primary={{ label: 'See how it works', to: '/how-it-works' }}
      secondary={{ label: 'Known limits', to: '/limitations' }}
      toc={TOC}
    >
      <Section
        id="results"
        eyebrow="The results"
        title={`${examples.length} prompts, screened for real`}
        lead="Pick a decision to see only the prompts that ended there."
      >
        <Callout kind="note">
          These results come from the real pipeline, run as a USER with no earlier history, and a backend test checks them on every
          build, so this page cannot drift from the code. Every value in every prompt is synthetic.
        </Callout>
        <FilterPills groupLabel="Show examples by decision" options={FILTERS} value={decision} onChange={setDecision} />
        <p className="ps-help" aria-live="polite">Showing {shown.length} of {examples.length} examples.</p>
        <div className="ps-stack">
          {shown.map((example) => <ExampleCard key={example.id} example={example} />)}
        </div>
        {missingDecisions.length > 0 && (
          <p className="ps-help">
            No prompt in this set ends in {missingDecisions.join(' or ')}, so {missingDecisions.length === 1 ? 'it has' : 'they have'} no filter.
          </p>
        )}
        <SourceCaption {...SNAPSHOT_SOURCE} />
      </Section>

      <section className="ps-closing" id="try">
        <h2 className="ps-section-head__title">Try your own</h2>
        <p className="ps-section-head__text">Sign in, write a prompt and see its decision, score and masked text before anything is sent.</p>
        <Link to={APP_ENTRY_PATH} className="ps-btn ps-btn--primary">Sign in</Link>
      </section>
    </ContentPage>
  )
}
