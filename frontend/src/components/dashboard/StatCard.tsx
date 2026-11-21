import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, Skeleton } from '../ui'

export interface Trend { pct: number | null; label: string }

export function StatCard({ icon: Icon, label, value, loading, unavailable, hint, trend, to }:
  { icon: LucideIcon; label: string; value?: string; loading?: boolean; unavailable?: boolean; hint?: string; trend?: Trend | null; to?: string }) {
  const body = (
    <Card className={`h-full p-4 transition-colors ${to ? 'hover:border-accent' : ''}`}>
      <div className="flex items-center justify-between"><p className="text-[13px] font-medium text-muted">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent"><Icon className="h-4 w-4" aria-hidden /></span></div>
      {loading ? <Skeleton className="mt-3 h-8 w-28" /> : unavailable ? <p className="mt-2 text-sm text-muted">Unavailable</p>
        : <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>}
      {!loading && !unavailable && (
        <div className="mt-1 flex min-h-5 flex-wrap items-center gap-x-2 text-xs text-muted">
          {trend && (trend.pct === null ? <span>No prior-period data</span> : (
            <span className={`inline-flex items-center gap-0.5 font-medium ${trend.pct >= 0 ? 'text-success' : 'text-danger'}`}>
              {trend.pct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}{Math.abs(trend.pct).toFixed(1)}%</span>))}
          {trend && trend.pct !== null && <span>{trend.label}</span>}
          {hint && <span>{hint}</span>}
        </div>)}
    </Card>)
  return to ? <Link to={to} className="block h-full">{body}</Link> : body
}
