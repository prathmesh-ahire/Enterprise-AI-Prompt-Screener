import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Callout } from '../../components/Callout'
import { entityLabel } from '../../components/EntityChips'
import { MetricTile } from '../../components/MetricTile'
import { SourceCaption } from '../../components/SourceCaption'
import { ContentPage } from '../../components/site/ContentPage'
import { FilterPills } from '../../components/site/FilterPills'
import { Section } from '../../components/site/Section'
import { DETECTOR_GROUPS, DETECTORS, SIGNALS, type DetectorInfo } from '../../content/detectors'
import { FIGURES, REPEATED_ATTACK } from '../../content/site'
import { detectorExample, PIPELINE, SNAPSHOT_SOURCE, severityTier, type DetectorExample } from '../../content/snapshot'

const TOC = [
  { id: 'detectors', label: 'The nine detectors' },
  { id: 'not-detected', label: 'What must not be caught' },
  { id: 'signals', label: 'The seven signals' },
  { id: 'curated', label: 'Repeats and your own terms' },
  { id: 'gaps', label: 'Known gaps' },
]

const TIER_WORD = { critical: 'Critical', high: 'High', medium: 'Medium' } as const

const FILTERS = [
  { value: 'all', label: 'All' },
  ...DETECTOR_GROUPS.map((g) => ({ value: g.id, label: g.label })),
]

const EXAMPLE_LOOK = {
  caught: { label: 'Caught (synthetic)', result: (e: DetectorExample) => `Sent as: ${e.maskedText}` },
  ignored: { label: 'Correctly ignored (synthetic)', result: () => 'Left as written: nothing is found.' },
  missed: { label: 'Missed (synthetic)', result: () => 'Not caught: sent as written.' },
}

function Example({ example }: { example: DetectorExample }) {
  const look = EXAMPLE_LOOK[example.kind]
  return (
    <div className="ps-stack ps-example">
      <span className="ps-label">{look.label}</span>
      <pre className="ps-codebox">{example.text}</pre>
      <span className="ps-help">{look.result(example)}</span>
    </div>
  )
}

function DetectorCard({ detector }: { detector: DetectorInfo }) {
  const tier = severityTier(detector.type)
  return (
    <article className="ps-card">
      <div className="ps-row">
        <h3 className="ps-card__title">{entityLabel(detector.type)}</h3>
        <span className={`ps-chip ps-chip--${tier}`}><span className="ps-chip__sev">{TIER_WORD[tier]}</span>severity</span>
      </div>
      <dl className="ps-facts">
        <div><dt className="ps-label">Pass 1: candidates</dt><dd>{detector.pass1}</dd></div>
        <div><dt className="ps-label">Pass 2: check</dt><dd>{detector.pass2}</dd></div>
        <div><dt className="ps-label">Replaced with</dt><dd><code className="ps-mono">{PIPELINE.placeholders[detector.type]}</code></dd></div>
      </dl>
      <Example example={detectorExample(detector.caught)} />
      <Example example={detectorExample(detector.ignored)} />
      {detector.type === 'ORG_CONFIDENTIAL' && (
        <p className="ps-help">These two examples run with the made-up term &ldquo;{PIPELINE.orgTermForExamples}&rdquo; on the list.</p>
      )}
    </article>
  )
}

export function DetectorsPage() {
  const [group, setGroup] = useState('all')
  const visibleTypes = group === 'all' ? null : DETECTOR_GROUPS.find((g) => g.id === group)?.types ?? []
  const shown = DETECTORS.filter((d) => !visibleTypes || visibleTypes.includes(d.type))
  const imei = detectorExample('card-imei')
  const url = detectorExample('apikey-url')
  const base64 = detectorExample('apikey-base64')
  const sshRsa = detectorExample('apikey-sshrsa')
  const dotted = detectorExample('phone-missed')

  return (
    <ContentPage
      title="What the screener looks for"
      lead="Nine detectors for sensitive data and seven checks for attempts to misuse the model, with what each one deliberately leaves alone."
      primary={{ label: 'Follow a prompt through', to: '/how-it-works' }}
      secondary={{ label: 'Known limits', to: '/limitations' }}
      toc={TOC}
    >
      <Section id="detectors" eyebrow="Detectors" title="Nine kinds of sensitive item" lead="Each detector finds candidates first, then checks them, and replaces what it finds with a placeholder.">
        <FilterPills groupLabel="Show detectors by category" options={FILTERS} value={group} onChange={setGroup} />
        <p className="ps-help" aria-live="polite">Showing {shown.length} of {DETECTORS.length} detectors.</p>
        <div className="ps-cards">
          {shown.map((d) => <DetectorCard key={d.type} detector={d} />)}
        </div>
        <SourceCaption {...SNAPSHOT_SOURCE} source={`examples, placeholders and severity from the ${SNAPSHOT_SOURCE.source}`} />
      </Section>

      <Section id="not-detected" eyebrow="Look-alikes" title="What must not be caught" lead="A false alarm masks or blocks an ordinary prompt, so the second pass matters as much as the first.">
        <div className="ps-prose">
          <p>
            A payment card&apos;s Luhn check digit is not enough on its own. A phone&apos;s IMEI is a 15-digit number that
            carries a Luhn digit by design, so in ordinary text most card-length numbers with a valid check digit were IMEIs.
            The card detector now also requires a real issuer prefix at a length that issuer uses.
          </p>
        </div>
        <div className="ps-grid">
          <MetricTile figure={FIGURES.imeiRuns} />
          <MetricTile figure={FIGURES.imeiRemoved} />
        </div>
        <div className="ps-cards">
          <article className="ps-card">
            <h3 className="ps-card__title">An IMEI</h3>
            <Example example={imei} />
          </article>
          <article className="ps-card">
            <h3 className="ps-card__title">A web address</h3>
            <Example example={url} />
            <p className="ps-card__text">Addresses and file paths look random enough to pass the entropy check, so a token with slashes must also mix upper case, lower case and digits and must not read as an address or path.</p>
          </article>
          <article className="ps-card">
            <h3 className="ps-card__title">A base64 secret</h3>
            <Example example={base64} />
            <p className="ps-card__text">The same rule still catches a real secret that contains slashes.</p>
          </article>
          <article className="ps-card">
            <h3 className="ps-card__title">A public key</h3>
            <Example example={sshRsa} />
            <p className="ps-card__text">An ssh-rsa key is the public half of a key pair, meant to be shared, so it is not a secret.</p>
          </article>
        </div>
        <SourceCaption {...SNAPSHOT_SOURCE} />
      </Section>

      <Section id="signals" eyebrow="Signals" title="Seven ways a prompt tries to misuse the model" lead="These raise the risk score; the first five match known phrasings, the last two measure the text and the sender.">
        <table className="ps-rows">
          <caption className="ps-sr">The seven risk signals and what each looks for</caption>
          <tbody>
            {SIGNALS.map((s) => (
              <tr key={s.type}>
                <th scope="row">{s.label}</th>
                <td>{s.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="ps-help">
          An instruction override or a policy bypass always sends the prompt to a reviewer. The other signals raise the score.
        </p>
      </Section>

      <Section id="curated" eyebrow="Context" title="Repeats and your own terms" lead="Two checks depend on more than the prompt in front of them.">
        <div className="ps-grid">
          <article className="ps-card">
            <h3 className="ps-card__title">Repeated attempts</h3>
            <p className="ps-card__text">
              When the same user has had {REPEATED_ATTACK.count} or more prompts blocked or sent for review in the last{' '}
              {REPEATED_ATTACK.hours} hours, each new prompt carries a repeated-attempts signal, which grows stronger with every
              further attempt.
            </p>
          </article>
          <article className="ps-card">
            <h3 className="ps-card__title">Your confidential terms</h3>
            <p className="ps-card__text">
              Project names and other internal words cannot be guessed by a pattern, so an administrator keeps the list. A term
              is matched as whole words, in any case, and replaced like any other finding.
            </p>
          </article>
        </div>
      </Section>

      <Section id="gaps" eyebrow="Known gaps" title="What it does not catch" lead="Three gaps found in testing and left open on purpose.">
        <div className="ps-grid">
          <article className="ps-card">
            <h3 className="ps-card__title">Names of people</h3>
            <p className="ps-card__text">There is no detector for people&apos;s names. Telling a name from an ordinary word needs a language model, which this rule-based screener does not use.</p>
            <Link className="ps-link" to="/limitations">Limitations</Link>
          </article>
          <article className="ps-card">
            <h3 className="ps-card__title">Reworded injection</h3>
            <p className="ps-card__text">The injection checks match known phrasings. The same request in other words is not recognised.</p>
            <Link className="ps-link" to="/limitations">Limitations</Link>
          </article>
          <article className="ps-card">
            <h3 className="ps-card__title">Phone numbers with dots</h3>
            <Example example={dotted} />
            <p className="ps-card__text">Allowing a dot inside a phone number could also catch decimal numbers, and there was no test set to prove it would not.</p>
            <Link className="ps-link" to="/limitations">Limitations</Link>
          </article>
        </div>
        <Callout kind="honesty">These gaps mean ALLOW is not proof that a prompt is clean. It means none of the checks found anything.</Callout>
        <SourceCaption {...SNAPSHOT_SOURCE} />
      </Section>
    </ContentPage>
  )
}
