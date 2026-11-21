import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ordersApi } from '../../api/services'
import { errorMessage } from '../../api/client'
import type { OrderSummary } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { ConfirmDialog } from '../../components/common/Dialog'
import { type Column, DataTable, type SortState } from '../../components/common/DataTable'
import { FilterBar, PageHeader } from '../../components/common/PageHeader'
import { SearchInput } from '../../components/common/SearchInput'
import { Button, Input, Select, StatusBadge, useToast } from '../../components/ui'
import { dateTime, label, money } from '../../lib/format'
import { NEXT_STATUS, ORDER_STATUSES } from '../../lib/orders'

export function AdminOrdersPage() {
  const [orderNumber, setOrderNumber] = useState(''); const [status, setStatus] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [page, setPage] = useState(0); const [sort, setSort] = useState<SortState>({ key: 'createdAt', dir: 'desc' })
  const [pending, setPending] = useState<OrderSummary | null>(null)
  const qc = useQueryClient(); const toast = useToast(); const { can } = useAuth()
  const q = useQuery({ queryKey: ['admin-orders', orderNumber, status, from, to, page, sort], queryFn: () => ordersApi.adminList({ orderNumber, status, from, to, page, size: 15, sortBy: sort.key, direction: sort.dir }) })
  const move = useMutation({
    mutationFn: (o: OrderSummary) => ordersApi.setStatus(o.id, NEXT_STATUS[o.status]),
    onSuccess: () => { toast('ok', 'Order status updated'); setPending(null); qc.invalidateQueries({ queryKey: ['admin-orders'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
    onError: e => { toast('err', errorMessage(e)); setPending(null) },
  })
  const canAct = can('ORDER_MANAGE') || can('ORDER_FULFIL')
  const reset = (fn: () => void) => { fn(); setPage(0) }

  const columns: Column<OrderSummary>[] = [
    { key: 'order', header: 'Order', cell: o => <Link className="font-medium text-accent hover:underline" to={`/admin/orders/${o.id}`}>{o.orderNumber}</Link> },
    { key: 'customer', header: 'Customer', hideable: true, cell: o => <span className="text-muted">Customer #{o.customerId}</span> },
    { key: 'date', header: 'Date', sortKey: 'createdAt', hideable: true, cell: o => <span className="whitespace-nowrap text-muted">{dateTime(o.createdAt)}</span> },
    { key: 'payment', header: 'Payment', hideable: true, cell: o => <StatusBadge status={o.paymentStatus} /> },
    { key: 'status', header: 'Status', cell: o => <StatusBadge status={o.status} /> },
    { key: 'total', header: 'Total', sortKey: 'total', align: 'right', cell: o => money(o.total) },
    { key: 'actions', header: '', align: 'right', cell: o => (
      <div className="flex justify-end gap-2">
        {canAct && NEXT_STATUS[o.status] && <Button size="sm" variant="secondary" onClick={() => setPending(o)}>Mark {label(NEXT_STATUS[o.status]).toLowerCase()}</Button>}
        <Link to={`/admin/orders/${o.id}`}><Button size="sm" variant="ghost">View</Button></Link>
      </div>) },
  ]
  return (
    <div>
      <PageHeader title="Orders" description="Search, filter and fulfil customer orders." />
      <FilterBar>
        <SearchInput className="w-64" value={orderNumber} onChange={v => reset(() => setOrderNumber(v))} label="Order number" placeholder="Exact order number, e.g. ORD-2026…" />
        <Select label="Status" value={status} onChange={e => reset(() => setStatus(e.target.value))} className="w-44"><option value="">All statuses</option>{ORDER_STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</Select>
        <Input label="From" type="date" value={from} max={to || undefined} onChange={e => reset(() => setFrom(e.target.value))} />
        <Input label="To" type="date" value={to} min={from || undefined} onChange={e => reset(() => setTo(e.target.value))} />
        {(orderNumber || status || from || to) && <Button variant="ghost" onClick={() => reset(() => { setOrderNumber(''); setStatus(''); setFrom(''); setTo('') })}>Clear filters</Button>}
      </FilterBar>
      <DataTable caption="Orders" storageKey="admin-orders" columns={columns} rows={q.data?.content} rowKey={o => o.id} loading={q.isLoading} error={q.isError ? errorMessage(q.error) : null} onRetry={() => q.refetch()}
        emptyTitle="No orders found" emptyHint="Try changing the filters." sort={sort} onSort={s => { setSort(s); setPage(0) }}
        page={page} totalPages={q.data?.totalPages} totalElements={q.data?.totalElements} onPage={setPage} />
      <ConfirmDialog open={!!pending} onClose={() => setPending(null)} loading={move.isPending} onConfirm={() => pending && move.mutate(pending)}
        title={pending ? `Mark ${pending.orderNumber} as ${label(NEXT_STATUS[pending.status]).toLowerCase()}?` : ''} description="The customer's tracking history will be updated." confirmLabel="Update status" />
    </div>)
}
