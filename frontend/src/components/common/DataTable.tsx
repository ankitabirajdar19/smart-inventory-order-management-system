import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Columns3 } from 'lucide-react'
import { Card, EmptyState, ErrorState, Pagination, Skeleton } from '../ui'
import { Dropdown } from './Dropdown'

export interface Column<T> { key: string; header: string; cell: (row: T) => ReactNode; sortKey?: string; className?: string; hideable?: boolean; align?: 'right' }
export interface SortState { key: string; dir: 'asc' | 'desc' }

interface Props<T> {
  columns: Column<T>[]; rows: T[] | undefined; rowKey: (row: T) => string | number
  loading?: boolean; error?: string | null; onRetry?: () => void
  emptyTitle?: string; emptyHint?: string; emptyAction?: ReactNode
  sort?: SortState; onSort?: (s: SortState) => void
  page?: number; totalPages?: number; totalElements?: number; onPage?: (p: number) => void
  storageKey?: string; caption?: string
}

export function DataTable<T>({ columns, rows, rowKey, loading, error, onRetry, emptyTitle = 'Nothing to show', emptyHint, emptyAction, sort, onSort, page = 0, totalPages = 1, totalElements, onPage, storageKey, caption }: Props<T>) {
  const [hidden, setHidden] = useState<string[]>(() => { try { return storageKey ? JSON.parse(localStorage.getItem(`cols:${storageKey}`) ?? '[]') : [] } catch { return [] } })
  useEffect(() => { if (storageKey) try { localStorage.setItem(`cols:${storageKey}`, JSON.stringify(hidden)) } catch { /* ignore */ } }, [hidden, storageKey])
  const visible = columns.filter(c => !hidden.includes(c.key))
  const hideable = columns.filter(c => c.hideable)

  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (!loading && rows && rows.length === 0) return <EmptyState title={emptyTitle} hint={emptyHint} action={emptyAction} />

  const toggleSort = (c: Column<T>) => {
    if (!c.sortKey || !onSort) return
    onSort({ key: c.sortKey, dir: sort?.key === c.sortKey && sort.dir === 'asc' ? 'desc' : 'asc' })
  }
  return (
    <Card className="overflow-hidden">
      {hideable.length > 0 && (
        <div className="flex justify-end border-b border-line px-3 py-2">
          <Dropdown label="Choose columns" width="w-52" triggerClassName="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted hover:bg-subtle hover:text-fg"
            trigger={<><Columns3 className="h-4 w-4" aria-hidden />Columns</>}>
            {() => hideable.map(c => (
              <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-subtle">
                <input type="checkbox" checked={!hidden.includes(c.key)} onChange={() => setHidden(h => h.includes(c.key) ? h.filter(k => k !== c.key) : [...h, c.key])} />{c.header}
              </label>))}
          </Dropdown>
        </div>)}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-subtle text-left text-xs uppercase tracking-wide text-muted">
            <tr>{visible.map(c => {
              const active = !!c.sortKey && sort?.key === c.sortKey
              return (
                <th key={c.key} scope="col" aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={`px-4 py-2.5 font-medium ${c.align === 'right' ? 'text-right' : ''} ${c.className ?? ''}`}>
                  {c.sortKey && onSort ? (
                    <button onClick={() => toggleSort(c)} className="inline-flex items-center gap-1 uppercase hover:text-fg">{c.header}
                      {active ? (sort!.dir === 'asc' ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />) : <ArrowUpDown className="h-3 w-3 opacity-50" aria-hidden />}
                    </button>) : c.header}
                </th>)
            })}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading || !rows
              ? Array.from({ length: 6 }, (_, i) => <tr key={i} aria-hidden>{visible.map(c => <td key={c.key} className="px-4 py-3"><Skeleton className="h-4 w-full max-w-[160px]" /></td>)}</tr>)
              : rows.map(r => <tr key={rowKey(r)} className="hover:bg-subtle/60">{visible.map(c => <td key={c.key} className={`px-4 py-3 align-middle ${c.align === 'right' ? 'text-right' : ''} ${c.className ?? ''}`}>{c.cell(r)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      {onPage && !loading && <div className="border-t border-line px-4 py-3"><Pagination page={page} totalPages={totalPages} total={totalElements} onChange={onPage} /></div>}
    </Card>
  )
}
