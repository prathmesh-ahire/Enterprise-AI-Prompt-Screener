import { Callout } from '../../components/Callout'
import { SourceCaption } from '../../components/SourceCaption'
import { ContentPage } from '../../components/site/ContentPage'
import { SvgDiagram, type SvgEdgeSpec, type SvgNodeSpec } from '../../components/site/Diagram'
import { Section } from '../../components/site/Section'
import { StepCard } from '../../components/site/StepCard'
import {
  API_DOCS_PATH, ARCHITECTURE_SOURCE, ENDPOINT_GROUPS, REQUEST_LIFECYCLE, ROLE_MATRIX, ROLE_MATRIX_NOTE,
  SECURITY_CONTROLS, TABLE_GROUPS, TECH_STACK,
} from '../../content/architecture'
import { OFFLINE_STATEMENT } from '../../content/site'

const TOC = [
  { id: 'system', label: 'The system' },
  { id: 'stack', label: 'Tech stack' },
  { id: 'lifecycle', label: 'One request' },
  { id: 'tables', label: 'The tables' },
  { id: 'roles', label: 'Roles' },
  { id: 'api', label: 'The API' },
  { id: 'security', label: 'Security controls' },
]

// Four columns: the browser and the front end, the API, then the model; the database sits
// under the API.
const NODE_W = 190
const NODE_H = 64
const COL_GAP = 70
const ROW_GAP = 72
const at = (col: number, row: number) => ({ x: col * (NODE_W + COL_GAP), y: row * (NODE_H + ROW_GAP), width: NODE_W, height: NODE_H })

const NODES: SvgNodeSpec[] = [
  { id: 'browser', title: 'Browser', meta: 'your machine', ...at(0, 0) },
  { id: 'react', title: 'React app', meta: 'port 5173', ...at(1, 0) },
  { id: 'api', title: 'Spring Boot API', meta: 'port 8080', ...at(2, 0) },
  { id: 'ollama', title: 'Ollama', meta: 'port 11434', ...at(3, 0) },
  { id: 'mysql', title: 'MySQL', meta: 'port 3306', ...at(2, 1) },
]
const EDGES: SvgEdgeSpec[] = [
  { from: 'browser', to: 'react' },
  { from: 'react', to: 'api' },
  { from: 'api', to: 'ollama' },
  { from: 'api', to: 'mysql' },
]

export function ArchitecturePage() {
  const tableCount = TABLE_GROUPS.reduce((sum, g) => sum + g.tables.length, 0)

  return (
    <ContentPage
      title="The whole system"
      lead="Four containers on one machine, with nothing sent anywhere else."
      primary={{ label: 'See how it works', to: '/how-it-works' }}
      secondary={{ label: 'Known limits', to: '/limitations' }}
      toc={TOC}
    >
      <Section id="system" eyebrow="The system" title="Everything on one machine" lead={OFFLINE_STATEMENT}>
        <SvgDiagram
          width={4 * NODE_W + 3 * COL_GAP}
          height={2 * NODE_H + ROW_GAP}
          nodes={NODES}
          edges={EDGES}
          label="The browser loads the React app, which calls the Spring Boot API. The API talks to the Ollama model and to the MySQL database."
          caption="The four containers started by Docker Compose, and the browser that uses them. The API is the only part that talks to the database and the model."
        />
        <Callout kind="note">
          The model runs in its own container with no outside connection needed, so a prompt that is allowed through still never
          leaves the machine.
        </Callout>
      </Section>

      <Section id="stack" eyebrow="Tech stack" title="What it is built with" lead="Versions as declared in the build files.">
        <div className="ps-stack">
          {TECH_STACK.map((group) => (
            <article className="ps-card" key={group.heading}>
              <h3 className="ps-card__title">{group.heading}</h3>
              <table className="ps-rows">
                <caption className="ps-sr">{group.heading}: each technology, its version and what it does</caption>
                <tbody>
                  {group.items.map((tech) => (
                    <tr key={tech.name}>
                      <th scope="row">{tech.name}</th>
                      <td className="ps-num">{tech.version ?? '—'}</td>
                      <td>{tech.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </div>
        <SourceCaption {...ARCHITECTURE_SOURCE} />
      </Section>

      <Section id="lifecycle" eyebrow="One request" title="From the browser to the database and back" lead="What every request goes through, in order.">
        <div className="ps-grid">
          {REQUEST_LIFECYCLE.map((hop, i) => (
            <StepCard key={hop.title} step={i + 1} title={hop.title}>{hop.text}</StepCard>
          ))}
        </div>
      </Section>

      <Section id="tables" eyebrow="The tables" title={`${tableCount} tables, grouped by purpose`}>
        <div className="ps-cards">
          {TABLE_GROUPS.map((group) => (
            <article className="ps-card" key={group.heading}>
              <h3 className="ps-card__title">{group.heading}</h3>
              <table className="ps-rows">
                <caption className="ps-sr">{group.heading}: the tables and what each holds</caption>
                <tbody>
                  {group.tables.map((table) => (
                    <tr key={table.name}>
                      <th scope="row"><code>{table.name}</code></th>
                      <td>{table.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </div>
      </Section>

      <Section id="roles" eyebrow="Roles" title="Who can do what" lead="Checked on the server for every endpoint, not only hidden in the pages.">
        <article className="ps-card">
          <table className="ps-rows">
            <caption className="ps-sr">What each role can do</caption>
            <thead>
              <tr>
                <th scope="col">Can</th>
                <th scope="col">User</th>
                <th scope="col">Reviewer</th>
                <th scope="col">Admin</th>
              </tr>
            </thead>
            <tbody>
              {ROLE_MATRIX.map((row) => (
                <tr key={row.what}>
                  <th scope="row">{row.what}</th>
                  <td>{row.user ? 'Yes' : 'No'}</td>
                  <td>{row.reviewer ? 'Yes' : 'No'}</td>
                  <td>{row.admin ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ps-help">{ROLE_MATRIX_NOTE}</p>
        </article>
      </Section>

      <Section
        id="api"
        eyebrow="The API"
        title="Endpoint groups"
        lead={`A running instance serves its full documentation at ${API_DOCS_PATH}.`}
      >
        <article className="ps-card">
          <table className="ps-rows">
            <caption className="ps-sr">The endpoint groups, who may call each and the paths in it</caption>
            <tbody>
              {ENDPOINT_GROUPS.map((group) => (
                <tr key={group.prefix}>
                  <th scope="row"><code>{group.prefix}</code></th>
                  <td>{group.who}</td>
                  <td>{group.paths.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </Section>

      <Section id="security" eyebrow="Security controls" title="What protects it" lead="Each was checked against the code before it was written here.">
        <div className="ps-grid">
          {SECURITY_CONTROLS.map((control) => (
            <article className="ps-card" key={control.title}>
              <h3 className="ps-card__title">{control.title}</h3>
              <p className="ps-card__text">{control.text}</p>
            </article>
          ))}
        </div>
        <SourceCaption {...ARCHITECTURE_SOURCE} />
      </Section>
    </ContentPage>
  )
}
