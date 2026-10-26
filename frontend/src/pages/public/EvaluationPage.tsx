import { Callout } from '../../components/Callout'
import { MetricTile } from '../../components/MetricTile'
import { RecallChart } from '../../components/RecallChart'
import { FigureCaption, SourceCaption } from '../../components/SourceCaption'
import { ContentPage } from '../../components/site/ContentPage'
import { Section } from '../../components/site/Section'
import {
  COMMISSIONED_ROWS, COMMISSIONED_SOURCE, MANUAL_ROOT_CAUSES, MANUAL_SECTIONS, MANUAL_SOURCE,
  PUBLIC_AUDIT_ROWS, PUBLIC_AUDIT_SOURCE,
} from '../../content/evaluation'
import { COMMISSIONED_SUMMARY, FIGURES, PUBLIC_DATASET_SUMMARY } from '../../content/site'

const TOC = [
  { id: 'glance', label: 'At a glance' },
  { id: 'synthetic', label: 'The project’s own set' },
  { id: 'public-dataset', label: 'A public dataset' },
  { id: 'commissioned', label: 'A commissioned corpus' },
  { id: 'base64', label: 'Base64-style keys' },
  { id: 'manual', label: 'The manual test pass' },
  { id: 'performance', label: 'Performance' },
  { id: 'automated', label: 'Automated checks' },
  { id: 'honesty', label: 'What this proves' },
]

const count = new Intl.NumberFormat('en')

export function EvaluationPage() {
  return (
    <ContentPage
      title="How well it works"
      lead="Every result on this page has its source and its date. Some were measured when this site was built; the rest were recorded earlier and say so."
      primary={{ label: 'See the examples', to: '/examples' }}
      secondary={{ label: 'Known limits', to: '/limitations' }}
      toc={TOC}
    >
      <Section id="glance" eyebrow="At a glance" title="Four measured figures" lead="Each was re-run when this site was built.">
        <div className="ps-grid">
          <MetricTile figure={FIGURES.backendTests} />
          <MetricTile figure={FIGURES.syntheticPassed} />
          <MetricTile figure={FIGURES.base64Caught} />
          <MetricTile
            figure={FIGURES.latencyAverageMs}
            unit="ms"
            label="average screening time, before the AI model, on the test machine"
          />
        </div>
      </Section>

      <Section
        id="synthetic"
        eyebrow="Measured"
        title="The project’s own set"
        lead={`${FIGURES.syntheticPassed.value} prompts the project wrote, each with the decision and the sensitive items it should produce.`}
      >
        <div className="ps-grid">
          <MetricTile figure={FIGURES.syntheticPassed} />
          <MetricTile figure={FIGURES.syntheticFound} />
          <MetricTile figure={FIGURES.syntheticPrecision} />
          <MetricTile figure={FIGURES.syntheticRecall} />
          <MetricTile figure={FIGURES.syntheticF1} />
        </div>
        <Callout kind="caution">
          The project wrote this set itself, so a perfect score shows that the checks do what they were built to do. It does not
          show how they would do on prompts written by someone else; the two audits below are for that.
        </Callout>
      </Section>

      <Section
        id="public-dataset"
        eyebrow="Recorded"
        title="A public dataset"
        lead="The first outside check: sentences from a public synthetic dataset of personal data."
      >
        <div className="ps-prose">
          <p>
            The detectors were tested against carrier sentences drawn from a 209k-row public synthetic PII dataset, with values
            localised to our scope. The file used was its English part, 43,501 rows, and only the {PUBLIC_AUDIT_ROWS.length} kinds of item in it that this project detects were scored. These are not an industry benchmark score: the dataset was not built for this project, but the
            scoring was set up by it.
          </p>
        </div>
        <RecallChart
          title="Recall by detector, public dataset"
          subtitle="The share of each kind of item in the dataset that the detector found."
          rows={PUBLIC_AUDIT_ROWS}
          caption={<SourceCaption {...PUBLIC_AUDIT_SOURCE} />}
        />
        <div className="ps-grid">
          <MetricTile figure={PUBLIC_DATASET_SUMMARY.fullyDetected} />
          <MetricTile figure={PUBLIC_DATASET_SUMMARY.harmlessClean} />
        </div>
        <div className="ps-prose">
          <p>
            The audit also found a false alarm worth knowing about. Of the {FIGURES.imeiRuns.value} card-length numbers in
            harmless text that pass the Luhn check, most were phone IMEIs, which carry a check digit of their own. Requiring a real
            card issuer prefix removed {FIGURES.imeiRemoved.value} of them with no loss of recall.
          </p>
        </div>
        <FigureCaption figure={FIGURES.imeiRemoved} />
      </Section>

      <Section
        id="commissioned"
        eyebrow="Recorded"
        title="A commissioned corpus"
        lead="The second outside check covers the detectors the public dataset has no labels for."
      >
        <RecallChart
          title="Recall by detector, commissioned corpus"
          subtitle="The share of each kind of item in the corpus that the detector found."
          rows={COMMISSIONED_ROWS}
          caption={<SourceCaption {...COMMISSIONED_SOURCE} />}
        />
        <div className="ps-grid">
          <MetricTile figure={COMMISSIONED_SUMMARY.fullyDetected} />
          <MetricTile figure={COMMISSIONED_SUMMARY.falsePositives} />
        </div>
        <div className="ps-prose">
          <p>
            The data needed cleaning before it could be used. Of the {count.format(COMMISSIONED_SUMMARY.rowsDelivered.value)} rows
            delivered, {count.format(COMMISSIONED_SUMMARY.duplicates.value)} (51%) were exact duplicates, which left{' '}
            {count.format(COMMISSIONED_SUMMARY.usable.value)} usable rows. The figures above use only those.
          </p>
        </div>
        <div className="ps-grid">
          <MetricTile figure={COMMISSIONED_SUMMARY.rowsDelivered} />
          <MetricTile figure={COMMISSIONED_SUMMARY.duplicates} />
          <MetricTile figure={COMMISSIONED_SUMMARY.usable} />
        </div>
        <Callout kind="honesty">
          The tools and data for both audits were deleted after use, so these figures were recorded on the dates shown and cannot be
          regenerated. The detectors they covered are checked by ordinary tests that stay in the project.
        </Callout>
      </Section>

      <Section
        id="base64"
        eyebrow="Measured"
        title="Base64-style keys"
        lead="Random keys built from letters, digits, slashes and plus signs look a lot like web addresses and file paths."
      >
        <div className="ps-grid">
          <MetricTile figure={FIGURES.base64Caught} />
          <MetricTile figure={FIGURES.base64Recall} />
          <MetricTile figure={FIGURES.benignFalseAlarms} />
        </div>
        <div className="ps-prose">
          <p>
            Before a fix on 2026-10-09 the detector caught none of this key set. The two it still misses are keys with more slashes
            than the detector allows, and a key that begins with a slash. Both are accepted gaps.
          </p>
        </div>
      </Section>

      <Section
        id="manual"
        eyebrow="Recorded"
        title="The manual test pass"
        lead="The whole system was tested by hand, item by item, in sections A to AN."
      >
        <div className="ps-grid">
          <MetricTile figure={FIGURES.manualItems} />
          <MetricTile figure={FIGURES.manualFailed} />
        </div>
        <article className="ps-card">
          <h3 className="ps-card__title">Results by section</h3>
          <table className="ps-rows">
            <caption className="ps-sr">Passed items out of total items, for each section of the manual test pass</caption>
            <tbody>
              {MANUAL_SECTIONS.map((section) => (
                <tr key={section.id}>
                  <th scope="row">{section.id} · {section.area}</th>
                  <td className="ps-right ps-num">{section.passed} of {section.total}</td>
                  <td>{section.other ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <SourceCaption {...MANUAL_SOURCE} />
        </article>
        <article className="ps-card">
          <h3 className="ps-card__title">The four causes, all fixed on 2026-09-22</h3>
          <table className="ps-rows">
            <caption className="ps-sr">The four root causes behind the failed items, and how each was fixed</caption>
            <tbody>
              {MANUAL_ROOT_CAUSES.map((cause) => (
                <tr key={cause.items}>
                  <th scope="row">{cause.items}</th>
                  <td>
                    {cause.problem} <span className="ps-muted">{cause.fix}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <SourceCaption {...MANUAL_SOURCE} />
        </article>
        <p className="ps-help">
          The report&apos;s own summary table and the headings of its sections give a slightly different count of passed items, so
          no overall pass count is shown here. The {FIGURES.manualItems.value} items and the {FIGURES.manualFailed.value} failures agree in both.
        </p>
      </Section>

      <Section
        id="performance"
        eyebrow="Performance"
        title="How long it takes"
        lead="The screener is quick. The model that answers afterwards is not."
      >
        <div className="ps-grid">
          <MetricTile
            figure={FIGURES.latencyAverageMs}
            unit="ms"
            label="average screening time, before the AI model, on the test machine"
          />
          <MetricTile
            figure={FIGURES.latencyMaxMs}
            unit="ms"
            label="slowest screening time, before the AI model, on the test machine"
          />
          <MetricTile
            figure={FIGURES.ollamaAverageMs}
            value={count.format(FIGURES.ollamaAverageMs.value)}
            unit="ms"
            label="average AI model reply, CPU only"
          />
          <MetricTile
            figure={FIGURES.ollamaMaxMs}
            value={count.format(FIGURES.ollamaMaxMs.value)}
            unit="ms"
            label="slowest AI model reply, CPU only"
          />
        </div>
        <div className="ps-grid">
          <MetricTile figure={FIGURES.statementsBefore} />
          <MetricTile figure={FIGURES.statementsAfter} />
        </div>
        <div className="ps-prose">
          <p>
            The two database figures are a count of statements, not a speed claim. Screening time moved by less than it varies from
            one run to the next on this machine, so a query reduction is all that was shown.
          </p>
        </div>
      </Section>

      <Section
        id="automated"
        eyebrow="Automated"
        title="Checks that run on every change"
        lead="Nothing here depends on someone remembering to run it."
      >
        <div className="ps-grid">
          <MetricTile figure={FIGURES.backendTests} />
          <MetricTile figure={FIGURES.regressionChecks} />
        </div>
        <div className="ps-prose">
          <p>
            The backend tests cover the detectors, the risk scoring, the decisions, masking, the AI gateway and the reply check, and the admin, review, report and audit services. The
            regression script then checks a running system from the outside. On every push and pull request to the main and develop
            branches, a continuous-integration run repeats the backend tests and the front end&apos;s lint and build.
          </p>
        </div>
      </Section>

      <Section id="honesty" eyebrow="What this proves" title="How far to trust these figures">
        <Callout kind="honesty">
          These results show that the screener finds the patterns it was built for. They do not show that it finds everything: the test sets are synthetic or commissioned, and the project wrote one of them. They were measured on one machine, and the model replies are from a computer with no graphics card. Read an ALLOW as &ldquo;no check found
          anything&rdquo;, never as &ldquo;safe&rdquo;.
        </Callout>
      </Section>
    </ContentPage>
  )
}
