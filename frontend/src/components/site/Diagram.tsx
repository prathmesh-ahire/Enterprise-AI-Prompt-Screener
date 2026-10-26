import { Fragment, useId } from 'react'

// Diagrams are drawn from the diagram-* tokens only - they carry no decision meaning, so
// no decision colour ever appears in one. A diagram is a picture for sighted readers:
// `label` is the one sentence a screen reader gets (the whole flow), and `caption` is the
// visible line under it. Dashed means conditional, and a dashed node is an optional or
// human step.

export interface DiagramNodeSpec {
  title: string
  meta?: string
  group?: boolean
}

export interface DiagramEdgeSpec {
  label?: string
  dashed?: boolean
}

interface DiagramProps {
  nodes: DiagramNodeSpec[]
  // One edge between each pair of neighbouring nodes: edges[i] joins nodes[i] to nodes[i + 1].
  edges: DiagramEdgeSpec[]
  label: string
  caption: string
}

// One row of nodes joined by arrows. It wraps rather than widening the page.
export function Diagram({ nodes, edges, label, caption }: DiagramProps) {
  return (
    <figure className="ps-figure">
      <div className="ps-diagram" role="img" aria-label={label}>
        {nodes.map((node, i) => (
          <Fragment key={node.title}>
            <div className={`ps-node${node.group ? ' ps-node--group' : ''}`}>
              <span className="ps-node__title">{node.title}</span>
              {node.meta && <span className="ps-node__meta">{node.meta}</span>}
            </div>
            {i < nodes.length - 1 && (
              <div className="ps-edge">
                <svg viewBox="0 0 56 12" aria-hidden="true">
                  <path d="M0 6h50" stroke="currentColor" strokeWidth="1.5" strokeDasharray={edges[i]?.dashed ? '4 4' : undefined} />
                  <path d="M48 1.5 55 6l-7 4.5z" fill="currentColor" />
                </svg>
                {edges[i]?.label && <span className="ps-edge__label">{edges[i].label}</span>}
              </div>
            )}
          </Fragment>
        ))}
      </div>
      <figcaption className="ps-source">{caption}</figcaption>
    </figure>
  )
}

// A diagram bigger than one row is drawn as inline SVG with the same tokens. Nodes sit at
// fixed positions in a viewBox that scales to the page; an edge leaves one node and enters
// another from the facing sides - side to side when the target is to the right, top to
// bottom when it is below - with one elbow when the two are not in line.
export interface SvgNodeSpec extends DiagramNodeSpec {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface SvgEdgeSpec extends DiagramEdgeSpec {
  from: string
  to: string
}

interface SvgDiagramProps {
  width: number
  height: number
  nodes: SvgNodeSpec[]
  edges: SvgEdgeSpec[]
  label: string
  caption: string
}

const TEXT_INSET = 16

function route(a: SvgNodeSpec, b: SvgNodeSpec): { d: string; labelAt: [number, number] } {
  if (b.x >= a.x + a.width) {
    const x1 = a.x + a.width
    const y1 = a.y + a.height / 2
    const x2 = b.x
    const y2 = b.y + b.height / 2
    const mid = (x1 + x2) / 2
    return {
      d: y1 === y2 ? `M${x1} ${y1}H${x2}` : `M${x1} ${y1}H${mid}V${y2}H${x2}`,
      labelAt: [mid, Math.min(y1, y2) - 8],
    }
  }
  const x1 = a.x + a.width / 2
  const y1 = a.y + a.height
  const x2 = b.x + b.width / 2
  const y2 = b.y
  const mid = (y1 + y2) / 2
  return {
    d: x1 === x2 ? `M${x1} ${y1}V${y2}` : `M${x1} ${y1}V${mid}H${x2}V${y2}`,
    labelAt: [Math.max(x1, x2) + 8, mid - 4],
  }
}

export function SvgDiagram({ width, height, nodes, edges, label, caption }: SvgDiagramProps) {
  const arrow = useId()
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return (
    <figure className="ps-figure">
      <svg className="ps-svg-diagram" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
        <defs>
          <marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0 0 10 5 0 10z" className="ps-svg-arrow" />
          </marker>
        </defs>
        {edges.map((edge) => {
          const a = byId.get(edge.from)
          const b = byId.get(edge.to)
          if (!a || !b) return null
          const { d, labelAt } = route(a, b)
          return (
            <g key={`${edge.from}-${edge.to}`}>
              <path d={d} className={`ps-svg-edge${edge.dashed ? ' ps-svg-edge--dashed' : ''}`} markerEnd={`url(#${arrow})`} />
              {edge.label && <text x={labelAt[0]} y={labelAt[1]} className="ps-svg-edge-label">{edge.label}</text>}
            </g>
          )
        })}
        {nodes.map((n) => (
          <g key={n.id}>
            <rect x={n.x} y={n.y} width={n.width} height={n.height} className={`ps-svg-node${n.group ? ' ps-svg-node--group' : ''}`} />
            <text x={n.x + TEXT_INSET} y={n.y + (n.meta ? n.height / 2 - 4 : n.height / 2)} className="ps-svg-node__title" dominantBaseline="middle">{n.title}</text>
            {n.meta && <text x={n.x + TEXT_INSET} y={n.y + n.height / 2 + 16} className="ps-svg-node__meta" dominantBaseline="middle">{n.meta}</text>}
          </g>
        ))}
      </svg>
      <figcaption className="ps-source">{caption}</figcaption>
    </figure>
  )
}
