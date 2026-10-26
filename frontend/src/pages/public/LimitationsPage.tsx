import { Callout } from '../../components/Callout'
import { SourceCaption } from '../../components/SourceCaption'
import { ContentPage } from '../../components/site/ContentPage'
import { Section } from '../../components/site/Section'
import { DEFECT_TIMELINE, DEVIATIONS, DETECTION_GAPS, TRADE_OFFS, type LimitItem } from '../../content/limitations'

const TOC = [
  { id: 'gaps', label: 'What it does not catch' },
  { id: 'trade-offs', label: 'Trade-offs kept' },
  { id: 'deviations', label: 'Where it differs' },
  { id: 'timeline', label: 'Defects found and fixed' },
  { id: 'honesty', label: 'The short version' },
]

function Cards({ items }: { items: readonly LimitItem[] }) {
  return (
    <div className="ps-grid">
      {items.map((item) => (
        <article className="ps-card" key={item.title}>
          <h3 className="ps-card__title">{item.title}</h3>
          <p className="ps-card__text">{item.text}</p>
          {item.evidence && <SourceCaption {...item.evidence} />}
        </article>
      ))}
    </div>
  )
}

export function LimitationsPage() {
  return (
    <ContentPage
      title="What it cannot do"
      lead="The gaps, the trade-offs kept on purpose and the defects found along the way, each in plain words."
      primary={{ label: 'See the evaluation', to: '/evaluation' }}
      secondary={{ label: 'See the detectors', to: '/detectors' }}
      toc={TOC}
    >
      <Section
        id="gaps"
        eyebrow="Detection gaps"
        title="What it does not catch"
        lead="These are open today. The figures on the Evaluation page do not cover them."
      >
        <Cards items={DETECTION_GAPS} />
      </Section>

      <Section
        id="trade-offs"
        eyebrow="Kept by decision"
        title="Trade-offs the project chose"
        lead="Each of these could be changed. They stay as they are for the reason given."
      >
        <Cards items={TRADE_OFFS} />
      </Section>

      <Section
        id="deviations"
        eyebrow="Against the source"
        title="Where it differs from the source document"
        lead="Three places where the project went its own way."
      >
        <Cards items={DEVIATIONS} />
      </Section>

      <Section
        id="timeline"
        eyebrow="Defects"
        title="Found and fixed, with dates"
        lead="Real problems, in the order they were fixed."
      >
        <article className="ps-card">
          <table className="ps-rows">
            <caption className="ps-sr">Defects found and fixed, by date</caption>
            <tbody>
              {DEFECT_TIMELINE.map((defect) => (
                <tr key={`${defect.date}-${defect.title}`}>
                  <th scope="row" className="ps-num">{defect.date}</th>
                  <td>
                    <strong>{defect.title}.</strong> {defect.text} <span className="ps-muted">Fixed.</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ps-source">Source: the project&apos;s decision log · recorded, dated by the day each fix was logged</p>
        </article>
      </Section>

      <Section id="honesty" eyebrow="The short version" title="What to take from this">
        <Callout kind="honesty">
          This is a rule-based screener built and tested by one project, on synthetic and commissioned data. It finds what its
          patterns describe and misses what they do not, so an ALLOW means that no check found anything and never that a prompt is
          safe.
        </Callout>
      </Section>
    </ContentPage>
  )
}
