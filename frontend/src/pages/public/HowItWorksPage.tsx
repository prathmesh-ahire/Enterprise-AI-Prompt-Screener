import { Link } from 'react-router-dom'
import { Callout } from '../../components/Callout'
import { DecisionBadge } from '../../components/DecisionBadge'
import { entityLabel } from '../../components/EntityChips'
import { inlineLabel } from '../../content/detectors'
import { RoleBadge } from '../../components/RoleBadge'
import { ScoreBreakdown } from '../../components/ScoreBreakdown'
import { breakdownLabel, rowsFromSnapshot } from '../../components/breakdownRows'
import { SourceCaption } from '../../components/SourceCaption'
import { PromptStatusPill } from '../../components/StatusPill'
import { BandStrip } from '../../components/site/BandStrip'
import { ContentPage } from '../../components/site/ContentPage'
import { SvgDiagram } from '../../components/site/Diagram'
import { Section } from '../../components/site/Section'
import { StepCard } from '../../components/site/StepCard'
import {
  bandRanges, detectorExample, PIPELINE, SNAPSHOT_SOURCE, snapshotExample, type SnapshotExample,
} from '../../content/snapshot'

const TOC = [
  { id: 'pipeline', label: 'The nine steps' },
  { id: 'two-pass', label: 'Two passes' },
  { id: 'sub-scores', label: 'Five sub-scores' },
  { id: 'formula', label: 'The formula' },
  { id: 'worked', label: 'Worked examples' },
  { id: 'bands', label: 'Bands' },
  { id: 'overrides', label: 'Rules that always apply' },
  { id: 'masking', label: 'Masking and confirming' },
  { id: 'roles', label: 'Who does what' },
  { id: 'response', label: 'Checking the reply' },
  { id: 'logging', label: 'What is recorded' },
]

const STEPS = [
  { title: 'Normalise', text: 'Spaces are trimmed, line endings unified and unsafe control characters removed. Invisible characters are kept, so later checks can still see a word broken up on purpose.' },
  { title: 'Detect', text: 'Nine detectors look for sensitive items. Where two findings overlap, the more confident one is kept, and on a tie the more severe.' },
  { title: 'Analyse', text: 'Seven checks look for attempts to override, expose or trick the model.' },
  { title: 'Sub-scores', text: 'The findings and signals become five numbers, each between 0 and 1.' },
  { title: 'Score', text: 'The five numbers are weighted and added into one risk score, between 0 and 100.' },
  { title: 'Decide', text: 'The score falls in one of five bands, and rules that always apply can raise the decision, never lower it.' },
  { title: 'Mask', text: 'Every finding is replaced by a placeholder whenever anything was found, whatever the decision.' },
  { title: 'Save', text: 'The prompt, its findings, signals and decision are stored, and the action is written to the audit trail.' },
  { title: 'Send or wait', text: 'An ALLOW goes to the model at once and its reply is checked. Anything else waits for you or for a reviewer.' },
]

// Nine steps in three rows, read left to right.
const NODE_W = 220
const NODE_H = 56
const COL_GAP = 120
const ROW_GAP = 64
const STEP_NODES = STEPS.map((step, i) => ({
  id: `s${i + 1}`,
  title: `${i + 1}. ${step.title}`,
  x: (i % 3) * (NODE_W + COL_GAP),
  y: Math.floor(i / 3) * (NODE_H + ROW_GAP),
  width: NODE_W,
  height: NODE_H,
  group: i === STEPS.length - 1,
}))
const STEP_EDGES = STEP_NODES.slice(1).map((node, i) => ({ from: STEP_NODES[i].id, to: node.id }))

const number = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })
const weightFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const rules = PIPELINE.subScoreRules
const weights = PIPELINE.formulaWeights
const ruleByName = Object.fromEntries(PIPELINE.overrideRules.map((r) => [r.rule, r]))

// The entity types whose per-finding weight equals `weight`, as readable names.
const typesWithSeverity = (weight: number) => Object.entries(rules.severityPerFinding)
  .filter(([, w]) => w === weight).map(([type]) => inlineLabel(type)).join(', ')
const severityWeights = [...new Set(Object.values(rules.severityPerFinding))].sort((a, b) => b - a)
const secretWeights = Object.entries(rules.secretCriticality).filter(([, w]) => w > 0).sort((a, b) => b[1] - a[1])

const ranges = bandRanges()
const { thresholds } = PIPELINE

// One sentence on how the decision came about: the band the score alone gave, and any rule
// that raised it.
function outcome(example: SnapshotExample): string {
  const score = number.format(example.riskScore)
  if (example.appliedOverrides.length === 0) {
    return `The score of ${score} is in the ${example.scoreBand} band, and no rule changes it.`
  }
  const raised = example.appliedOverrides.map((name) => ruleByName[name].description.replace(/\.$/, '')).join('; ')
  return `The score of ${score} alone would give ${example.scoreBand}. ${raised}: ${example.decision}.`
}

function WorkedExample({ title, example }: { title: string; example: SnapshotExample }) {
  return (
    <article className="ps-card">
      <h3 className="ps-card__title">{title}</h3>
      <span className="ps-label">Synthetic prompt</span>
      <pre className="ps-codebox">{example.text}</pre>
      <ScoreBreakdown
        rows={rowsFromSnapshot(example)}
        total={example.riskScore}
        decision={example.decision}
        caption={`Score breakdown: ${title.toLowerCase()}`}
      />
      <p className="ps-card__text">{outcome(example)}</p>
    </article>
  )
}

export function HowItWorksPage() {
  const cardIgnored = detectorExample('card-ignored')
  const cardCaught = detectorExample('card-caught')
  const placeholders = Object.entries(PIPELINE.placeholders)

  return (
    <ContentPage
      title="From typed to sent"
      lead="What happens between pressing send and the model seeing your prompt, step by step, with the real numbers."
      primary={{ label: 'See the detectors', to: '/detectors' }}
      secondary={{ label: 'Known limits', to: '/limitations' }}
      toc={TOC}
    >
      <Section id="pipeline" eyebrow="The pipeline" title="Nine steps, in order" lead="All nine run on this machine. Only an ALLOW goes on to the model straight away.">
        <SvgDiagram
          width={2 * (NODE_W + COL_GAP) + NODE_W}
          height={3 * NODE_H + 2 * ROW_GAP}
          nodes={STEP_NODES}
          edges={STEP_EDGES}
          label="The nine steps in order: normalise, detect, analyse, sub-scores, score, decide, mask, save, then send or wait."
          caption="The nine steps. The last one, drawn dashed, depends on the decision."
        />
        <div className="ps-grid">
          {STEPS.map((step, i) => (
            <StepCard key={step.title} step={i + 1} title={step.title}>{step.text}</StepCard>
          ))}
        </div>
        <Callout kind="note">
          The screening time the app records covers steps 2 to 5 only, from detection to the score. That is the
          screener&apos;s own work; saving to the database and the model&apos;s reply, which takes far longer, are not part of it.
        </Callout>
      </Section>

      <Section id="two-pass" eyebrow="Two passes" title="Wide net, then a strict check" lead="Every detector works in two passes, so it can find more without raising more false alarms.">
        <div className="ps-prose">
          <p>
            The first pass casts a wide net: anything with the right shape is a candidate. The second pass checks each
            candidate properly and drops the look-alikes. A wide first pass finds more real items; a strict second pass
            keeps the false alarms down.
          </p>
          <p>
            A payment card is the clearest case. Any run of 13 to 19 digits is a candidate, but only a number with a
            correct Luhn check digit and a real card issuer prefix is a card.
          </p>
        </div>
        <div className="ps-grid">
          <article className="ps-card">
            <h3 className="ps-card__title">Ignored: fails the check digit</h3>
            <pre className="ps-codebox">{cardIgnored.text}</pre>
            <p className="ps-card__text">Sixteen digits, so pass 1 picks it up. The Luhn check fails, so pass 2 drops it and nothing is masked.</p>
          </article>
          <article className="ps-card">
            <h3 className="ps-card__title">Caught: a real card shape</h3>
            <pre className="ps-codebox">{cardCaught.maskedText}</pre>
            <p className="ps-card__text">The check digit is right and the number starts with a real issuer prefix, so it is replaced.</p>
          </article>
        </div>
        <SourceCaption {...SNAPSHOT_SOURCE} />
      </Section>

      <Section id="sub-scores" eyebrow="Sub-scores" title="Five numbers between 0 and 1" lead="Each sub-score measures one kind of risk.">
        <table className="ps-rows">
          <caption className="ps-sr">The five sub-scores and how each is worked out</caption>
          <tbody>
            <tr>
              <th scope="row">{breakdownLabel('sensitiveData')}</th>
              <td>
                Each finding adds its weight: {severityWeights.map((w) => `${number.format(w)} for ${typesWithSeverity(w)}`).join('; ')}.
                The total stops at 1.
              </td>
            </tr>
            <tr>
              <th scope="row">{breakdownLabel('injection')}</th>
              <td>
                Each matched attempt to override, expose, bypass, extract a secret or role-play adds {number.format(rules.injectionPerPhrase)}.
                The total stops at 1.
              </td>
            </tr>
            <tr>
              <th scope="row">{breakdownLabel('secretCriticality')}</th>
              <td>
                The most serious secret found: {secretWeights.map(([type, w]) => `${number.format(w)} for ${inlineLabel(type)}`).join(', ')}, otherwise 0.
              </td>
            </tr>
            <tr>
              <th scope="row">{breakdownLabel('policyContext')}</th>
              <td>
                A starting value for the sender&apos;s role ({Object.entries(rules.roleBaseline).map(([role, v]) => `${role.charAt(0)}${role.slice(1).toLowerCase()} ${number.format(v)}`).join(', ')}),
                plus the prompt&apos;s length as a share of the maximum length ({PIPELINE.defaults.maxPromptLength} characters by default), counting at most {number.format(rules.lengthShareCap)}.
              </td>
            </tr>
            <tr>
              <th scope="row">{breakdownLabel('obfuscation')}</th>
              <td>The stronger of two signals, each between 0 and 1: hidden or disguised text, and repeated attempts by the same user.</td>
            </tr>
          </tbody>
        </table>
        <SourceCaption {...SNAPSHOT_SOURCE} />
      </Section>

      <Section id="formula" eyebrow="The formula" title="One weighted sum" lead="The five sub-scores are weighted, added and scaled to between 0 and 100.">
        <pre className="ps-codebox ps-formula">
          {'risk score = 100 × ( '}
          {Object.entries(weights).map(([name, w], i) => `${i ? ' + ' : ''}${weightFormat.format(w)} × ${breakdownLabel(name).toLowerCase()}`).join('')}
          {' )'}
        </pre>
        <p className="ps-prose">
          The weights add up to {weightFormat.format(Object.values(weights).reduce((a, b) => a + b, 0))}, so a prompt that
          maxes out every sub-score scores 100.
        </p>
        <SourceCaption {...SNAPSHOT_SOURCE} />
      </Section>

      <Section id="worked" eyebrow="Worked examples" title="Three prompts, scored" lead="Real results from the pipeline for three synthetic prompts, screened as a user.">
        <WorkedExample title="A short, safe question" example={snapshotExample('safe-1')} />
        <WorkedExample title="A lone API key" example={snapshotExample('apikey-1')} />
        <WorkedExample title="An injection phrase" example={snapshotExample('injection-1')} />
        <SourceCaption {...SNAPSHOT_SOURCE} />
      </Section>

      <Section id="bands" eyebrow="Bands" title="From score to decision" lead="The score picks a band, and each band has a decision.">
        <div className="ps-card">
          <BandStrip />
        </div>
        <div className="ps-prose">
          <p>
            These are the defaults: {ranges.map((b) => `${b.decision} ${b.from}–${b.to}`).join(', ')}.
            An administrator can move the thresholds on the Policy page, and a change applies from the next prompt.
          </p>
          <p>
            The project document describes a single high band from {thresholds.confirm} to {thresholds.block - 1}, answered by
            confirming or reviewing. Splitting it at {thresholds.review} into CONFIRM and REVIEW is this project&apos;s own
            design choice: the lower half asks you, the upper half asks a reviewer.
          </p>
        </div>
        <SourceCaption {...SNAPSHOT_SOURCE} source={`default policy, ${SNAPSHOT_SOURCE.source}`} />
      </Section>

      <Section id="overrides" eyebrow="Rules that always apply" title="When the score is not enough" lead="Three rules can raise a decision. None of them can lower one.">
        <table className="ps-rows">
          <caption className="ps-sr">The three rules that always apply, and the lowest decision each one allows</caption>
          <tbody>
            {PIPELINE.overrideRules.map((rule) => (
              <tr key={rule.rule}>
                <td>{rule.description}</td>
                <td className="ps-right"><span className="ps-sr">At least </span><DecisionBadge decision={rule.floor} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ps-prose">
          <p>
            Without them, the score alone would let serious things through. A lone API key scores{' '}
            {number.format(snapshotExample('apikey-1').riskScore)}, in the {snapshotExample('apikey-1').scoreBand} band, so it
            would be masked and sent rather than blocked. &ldquo;Ignore previous instructions&rdquo; on its own scores{' '}
            {number.format(snapshotExample('injection-1').riskScore)}, an ALLOW. A single email address scores{' '}
            {number.format(snapshotExample('email-1').riskScore)}, which would forward it unmasked.
          </p>
          <p>The score decides how strongly to react. The rules decide that the screener reacts at all.</p>
        </div>
        <SourceCaption {...SNAPSHOT_SOURCE} />
      </Section>

      <Section id="masking" eyebrow="Masking" title="Masking and confirming" lead="What the model receives in place of each sensitive item, and what you do before it is sent.">
        <table className="ps-rows">
          <caption className="ps-sr">The placeholder that replaces each kind of sensitive item</caption>
          <tbody>
            {placeholders.map(([type, placeholder]) => (
              <tr key={type}>
                <td>{entityLabel(type)}</td>
                <td className="ps-right"><code className="ps-mono">{placeholder}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ps-prose">
          <p>
            For MASK you see the masked prompt and send it with one click. For CONFIRM you also see a summary of what was
            found and can cancel instead. Only the masked text is ever sent, never the original.
          </p>
        </div>
        <div className="ps-grid">
          <StepCard step={1} title="Screened">
            Saved with its decision. A BLOCK stops here for good: <PromptStatusPill status="BLOCKED" />
          </StepCard>
          <StepCard step={2} title="Waiting">
            A MASK or CONFIRM waits for you: <PromptStatusPill status="PENDING_CONFIRM" /> A REVIEW waits for a reviewer: <PromptStatusPill status="PENDING_REVIEW" />
          </StepCard>
          <StepCard step={3} title="Sent">
            The masked text goes to the model and the reply is checked before you see it: <PromptStatusPill status="COMPLETED" />
          </StepCard>
        </div>
        <SourceCaption {...SNAPSHOT_SOURCE} />
      </Section>

      <Section id="roles" eyebrow="Roles" title="Who does what" lead="Three roles, each seeing only what it needs.">
        <div className="ps-grid">
          <article className="ps-card">
            <RoleBadge role="USER" />
            <h3 className="ps-card__title">Writes prompts</h3>
            <p className="ps-card__text">
              Submits prompts, sees each decision and masked text, confirms or cancels, and reads their own history and audit trail.
            </p>
          </article>
          <article className="ps-card">
            <RoleBadge role="REVIEWER" />
            <h3 className="ps-card__title">Decides what was held</h3>
            <p className="ps-card__text">
              Works the review queue: sees the masked prompt, the types found, the score and the signals, never the original
              values, and approves, rejects, asks for a correction or marks a false positive.
            </p>
          </article>
          <article className="ps-card">
            <RoleBadge role="ADMIN" />
            <h3 className="ps-card__title">Sets the rules</h3>
            <p className="ps-card__text">
              Everything a reviewer can do, plus users, thresholds and detectors, confidential terms, approved models, how long
              prompts are kept, reports and the full audit log.
            </p>
          </article>
        </div>
      </Section>

      <Section id="response" eyebrow="The reply" title="The reply is checked too" lead="The model's answer is screened before you see it.">
        <div className="ps-prose">
          <p>
            Two checks run on every reply. All nine detectors run on it, and it is compared with the values that were masked
            out of your prompt, in case the model repeats one. If either check finds something, you see a message saying the
            reply was withheld and to contact your reviewer, and the withheld reply is recorded in the audit trail.
          </p>
        </div>
      </Section>

      <Section id="logging" eyebrow="Records" title="What is recorded, and what never is" lead="The trail says what happened without repeating what was typed.">
        <div className="ps-grid">
          <article className="ps-card">
            <h3 className="ps-card__title">Recorded</h3>
            <p className="ps-card__text">
              Who acted, what they did and when, which prompt it concerned, and its risk band. For each finding: its type,
              position and confidence. For each signal: its type.
            </p>
          </article>
          <article className="ps-card">
            <h3 className="ps-card__title">Never recorded</h3>
            <p className="ps-card__text">
              The value of anything found, and the prompt text, in the audit trail or the application logs.
            </p>
          </article>
        </div>
        <div className="ps-prose">
          <p>
            The full prompt is kept in the database, which keeps the design simple. Two controls make up for it: no part of the
            app ever returns the original text when a masked copy exists, and old prompts are deleted every night once they
            are older than the retention period, {PIPELINE.defaults.retentionDays} days by default, which an administrator can
            change. The audit trail is kept after the prompts it describes are deleted.
          </p>
          <p><Link className="ps-link" to="/limitations">What this design does not protect against</Link></p>
        </div>
        <SourceCaption {...SNAPSHOT_SOURCE} />
      </Section>
    </ContentPage>
  )
}
