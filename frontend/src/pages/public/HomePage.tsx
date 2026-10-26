import { Link } from 'react-router-dom'
import { Callout } from '../../components/Callout'
import { DecisionBadge } from '../../components/DecisionBadge'
import { entityLabel } from '../../components/EntityChips'
import { MetricTile } from '../../components/MetricTile'
import { SourceCaption } from '../../components/SourceCaption'
import { BandStrip } from '../../components/site/BandStrip'
import { ColorBendsZone } from '../../components/site/ColorBendsZone'
import { Diagram } from '../../components/site/Diagram'
import { HeroGlow } from '../../components/site/HeroGlow'
import { Section } from '../../components/site/Section'
import { StepCard } from '../../components/site/StepCard'
import { APP_ENTRY_PATH, FIGURES } from '../../content/site'
import { DETECTOR_GROUPS } from '../../content/detectors'
import { bandRanges, SNAPSHOT_SOURCE, snapshotExample } from '../../content/snapshot'

// Every example on this page is a synthetic prompt from the pipeline snapshot, shown with the
// decision the real pipeline gave it; every figure carries its source.
const leakage = snapshotExample('email-1')
const injection = snapshotExample('injection-1')
const beforeAfter = snapshotExample('combined-1')

const WHAT_HAPPENS: Record<string, string> = {
  ALLOW: 'Sent to the model as written. Nothing sensitive was found.',
  MASK: 'Each detected item is replaced with a placeholder, and you confirm before the masked text is sent.',
  CONFIRM: 'You see a summary of what was found, then send the masked text or cancel.',
  REVIEW: 'Held until a reviewer approves or rejects it. Nothing is sent before then.',
  BLOCK: 'Never sent to the model.',
}

function SyntheticExample({ label, text, decision }: { label: string; text: string; decision: string }) {
  return (
    <div className="ps-stack ps-example">
      <span className="ps-label">{label}</span>
      <pre className="ps-codebox">{text}</pre>
      <div className="ps-row"><DecisionBadge decision={decision} /></div>
    </div>
  )
}

export function HomePage() {
  return (
    <ColorBendsZone
      hero={(
        <HeroGlow
          title="Every prompt is screened before it reaches the model."
          lead="Before anything reaches the AI model, the screener looks for sensitive data and attempts to override the model's rules, all on this machine, and decides what may be sent."
          primary={{ label: 'Follow a prompt through', to: '/how-it-works' }}
          secondary={{ label: 'Known limits', to: '/limitations' }}
        />
      )}
    >
      <div className="public-page ps-sections">
        <Section
          eyebrow="Two problems"
          title="What a prompt can carry"
          lead="People paste things into a prompt that should never leave the company, and some prompts try to talk the model out of its rules."
        >
          <div className="ps-grid">
            <article className="ps-card">
              <h3 className="ps-card__title">Data leakage</h3>
              <p className="ps-card__text">
                An email address, a card number, a password or a key typed into a prompt goes wherever the prompt goes.
                The screener finds these items and replaces them before anything is sent.
              </p>
              <SyntheticExample label="Synthetic example" text={leakage.text} decision={leakage.decision} />
            </article>
            <article className="ps-card">
              <h3 className="ps-card__title">Prompt injection</h3>
              <p className="ps-card__text">
                A prompt can tell the model to ignore its instructions, reveal them or drop its restrictions.
                The screener recognises these attempts and holds the prompt for a person to look at.
              </p>
              <SyntheticExample label="Synthetic example" text={injection.text} decision={injection.decision} />
            </article>
          </div>
        </Section>

        <Section
          eyebrow="Decisions"
          title="Five possible outcomes"
          lead="Each prompt gets one decision, from its risk score and a few rules that always apply."
        >
          <div className="ps-card">
            <BandStrip />
            <table className="ps-rows">
              <caption className="ps-sr">The five decisions, what happens to the prompt, and the default score range</caption>
              <thead className="ps-sr">
                <tr><th>Decision</th><th>What happens</th><th>Default score range</th></tr>
              </thead>
              <tbody>
                {bandRanges().map((band) => (
                  <tr key={band.decision}>
                    <td><DecisionBadge decision={band.decision} /></td>
                    <td>{WHAT_HAPPENS[band.decision]}</td>
                    <td className="ps-num ps-right">{band.from}–{band.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <SourceCaption {...SNAPSHOT_SOURCE} source={`default policy, ${SNAPSHOT_SOURCE.source}`} />
          </div>
        </Section>

        <Section
          eyebrow="How it works"
          title="Checked before it is sent"
          lead="Everything happens on this machine, before the model sees a word of the prompt."
        >
          <div className="ps-grid">
            <StepCard step={1} title="Look for sensitive data">
              Nine detectors look for personal, financial and government data, credentials and your organisation's own confidential terms.
            </StepCard>
            <StepCard step={2} title="Weigh the risk" active>
              Seven checks look for attempts to override the model. Everything found is combined into one risk score, between 0 and 100.
            </StepCard>
            <StepCard step={3} title="Decide">
              The score picks one of five decisions, and rules that always apply can raise it. Only then is anything sent.
            </StepCard>
          </div>
          <Diagram
            nodes={[
              { title: 'Prompt', meta: 'As you typed it' },
              { title: 'Detectors', meta: 'Nine kinds of item' },
              { title: 'Risk score', meta: 'A weighted sum' },
              { title: 'Decision', meta: 'Band and rules' },
              { title: 'Reviewer', meta: 'Only when held', group: true },
            ]}
            edges={[{ label: 'checked' }, { label: 'what was found' }, { label: 'a number' }, { label: 'held', dashed: true }]}
            label="A prompt is checked by the detectors, given a risk score and then one decision; a REVIEW decision goes to a reviewer."
            caption="The path of one prompt. A dashed line is a step that happens only sometimes."
          />
          <p><Link className="ps-link" to="/how-it-works">Every step, in order</Link></p>
        </Section>

        <Section
          eyebrow="Detectors"
          title="What it looks for"
          lead="Nine kinds of sensitive item, in five groups. Each one found is replaced by a placeholder that names its type."
        >
          <div className="ps-split">
            <dl className="ps-groups">
              {DETECTOR_GROUPS.map((group) => (
                <div key={group.id}>
                  <dt className="ps-eyebrow">{group.label}</dt>
                  <dd>{group.types.map(entityLabel).join(' · ')}</dd>
                </div>
              ))}
            </dl>
            <div className="ps-card">
              <span className="ps-label">As written (synthetic)</span>
              <pre className="ps-codebox">{beforeAfter.text}</pre>
              <span className="ps-label">As the model would receive it</span>
              <pre className="ps-codebox">{beforeAfter.maskedText}</pre>
              <div className="ps-row">
                <DecisionBadge decision={beforeAfter.decision} />
                <span className="ps-card__text">
                  Each item is replaced by a placeholder that names its type, and you confirm before it is sent.
                </span>
              </div>
              <SourceCaption {...SNAPSHOT_SOURCE} />
            </div>
          </div>
        </Section>

        <Section
          eyebrow="By the numbers"
          title="Measured, with sources"
          lead="Each figure comes from a test in this project that you can run yourself."
        >
          <div className="ps-grid">
            <MetricTile
              figure={FIGURES.base64Caught}
              caption={<SourceCaption source="project test set (base64-secret-corpus.txt)" date={FIGURES.base64Caught.date} kind={FIGURES.base64Caught.kind} to="/evaluation" />}
            />
            <MetricTile
              figure={FIGURES.benignFalseAlarms}
              caption={<SourceCaption source="project test set (benign-slash-corpus.txt)" date={FIGURES.benignFalseAlarms.date} kind={FIGURES.benignFalseAlarms.kind} to="/evaluation" />}
            />
            <MetricTile
              figure={FIGURES.latencyAverageMs}
              unit="ms"
              label="average screening time, before the AI model, on the test machine"
              caption={<SourceCaption source="project test set (ScreeningPipelineLatencyTest, 50 prompts)" date={FIGURES.latencyAverageMs.date} kind={FIGURES.latencyAverageMs.kind} to="/evaluation" />}
            />
          </div>
        </Section>

        <Section
          eyebrow="Limitations"
          title="What it cannot promise"
          lead="The screener is a set of rules, and rules have edges."
        >
          <Callout kind="honesty">
            The detectors recognise patterns, so a secret written in an unusual way can pass unnoticed, and the injection checks
            only know the phrasings they were given. An ALLOW tells you no check found anything; it does not prove the prompt is clean.
          </Callout>
          <p><Link className="ps-link" to="/limitations">All the known limits</Link></p>
        </Section>

        <section className="ps-closing">
          <h2 className="ps-section-head__title">Screen your own prompts</h2>
          <p className="ps-section-head__text">Sign in, write a prompt and see the decision before anything is sent.</p>
          <Link to={APP_ENTRY_PATH} className="ps-btn ps-btn--primary">Open the app</Link>
        </section>
      </div>
    </ColorBendsZone>
  )
}
