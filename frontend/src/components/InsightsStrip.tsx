import { useEffect, useState } from 'react'
import { apiClient, extractErrorMessage } from '../api/client'
import { EntityBreakdownChart, RiskBandDonut, type EntityStat, type RiskBandStat } from './DashboardCharts'
import { LoadingState } from './DataState'
import { MetricTile } from './MetricTile'
import { PageMessage } from './PageMessage'
import { LiveSourceCaption } from './SourceCaption'

// The figures a reviewer or administrator sees above the review queue: today's summary, the
// risk distribution over the last 7 days and the entity breakdown over all time. It reuses the
// dashboard's charts, so each panel states its own period. The three endpoints it reads are
// open to both roles.
interface Summary {
  total: number
  allowed: number
  masked: number
  confirm: number
  blocked: number
  pendingReview: number
}

export function InsightsStrip() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [entityStats, setEntityStats] = useState<EntityStat[]>([])
  const [riskBands, setRiskBands] = useState<RiskBandStat[]>([])
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      apiClient.get<Summary>('/api/dashboard/summary'),
      apiClient.get<EntityStat[]>('/api/dashboard/entity-stats'),
      apiClient.get<RiskBandStat[]>('/api/dashboard/risk-distribution'),
    ])
      .then(([summaryRes, entityRes, riskRes]) => {
        if (cancelled) return
        setSummary(summaryRes.data)
        setEntityStats(entityRes.data)
        setRiskBands(riskRes.data)
        setLoadedAt(new Date())
      })
      .catch((err) => { if (!cancelled) setError(extractErrorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (error) return <PageMessage kind="error">{error}</PageMessage>
  if (loading) return <LoadingState label="Loading the figures…" />
  if (!summary) return null

  const tiles: [string, number][] = [
    ['Prompts screened', summary.total],
    ['ALLOW', summary.allowed],
    ['MASK', summary.masked],
    ['CONFIRM', summary.confirm],
    ['BLOCK', summary.blocked],
    ['Waiting for review', summary.pendingReview],
  ]

  return (
    <section className="ps-stack" aria-label="Screening figures">
      <div className="ps-card">
        <h2 className="ps-card__title">Summary for today</h2>
        <div className="ps-metrics">
          {tiles.map(([label, value]) => <MetricTile key={label} label={label} value={value} />)}
        </div>
        <LiveSourceCaption window="today" updatedAt={loadedAt} />
      </div>
      <div className="chart-grid">
        <RiskBandDonut data={riskBands} updatedAt={loadedAt} />
        <EntityBreakdownChart data={entityStats} updatedAt={loadedAt} />
      </div>
    </section>
  )
}
