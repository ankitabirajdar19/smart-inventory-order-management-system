import type { ReactNode } from 'react'
import { Card, EmptyState, ErrorState, Skeleton } from '../ui'

export function ChartCard({ title, description, loading, error, empty, emptyText = 'No data for this period', height = 'h-64', children, onRetry }:
  { title: string; description?: string; loading?: boolean; error?: string | null; empty?: boolean; emptyText?: string; height?: string; children: ReactNode; onRetry?: () => void }) {
  return (
    <Card className="p-4">
      <h3 className="text-[15px] font-semibold">{title}</h3>{description && <p className="mb-3 text-xs text-muted">{description}</p>}
      <div className={`${description ? '' : 'mt-3'} ${height}`}>
        {loading ? <Skeleton className="h-full w-full" /> : error ? <ErrorState message={error} onRetry={onRetry} /> : empty ? <EmptyState title={emptyText} /> : children}
      </div>
    </Card>
  )
}
