import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { inventoryApi, warehousesApi } from '../../api/services'
import { errorMessage } from '../../api/client'
import type { Movement } from '../../api/types'
import { type Column, DataTable } from '../../components/common/DataTable'
import { FilterBar, PageHeader } from '../../components/common/PageHeader'
import { Badge, Button, Input, type Tone } from '../../components/ui'
import { dateTime, label, num } from '../../lib/format'

const IN = ['PURCHASE_IN', 'RETURN_IN', 'ADJUSTMENT_IN', 'TRANSFER_IN', 'RESERVATION_RELEASE']
const tone = (t: string): Tone => (t === 'RESERVATION' ? 'warning' : IN.includes(t) ? 'success' : t === 'SALE_OUT' ? 'info' : 'danger')

export function MovementsPage() {
  const [params, setParams] = useSearchParams(); const productId = params.get('productId') ?? ''
  const [page, setPage] = useState(0)
  const q = useQuery({ queryKey: ['movements', productId, page], queryFn: () => inventoryApi.movements({ productId: productId || undefined, page, size: 20 }) })
  const wh = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list })
  const whName = (id: number) => wh.data?.find(w => w.id === id)?.name ?? `Warehouse #${id}`
  const columns: Column<Movement>[] = [
    { key: 'date', header: 'Date', cell: m => <span className="whitespace-nowrap text-muted">{dateTime(m.createdAt)}</span> },
    { key: 'product', header: 'Product', cell: m => `Product #${m.productId}` },
    { key: 'warehouse', header: 'Warehouse', hideable: true, cell: m => whName(m.warehouseId) },
    { key: 'type', header: 'Type', cell: m => <Badge tone={tone(m.type)}>{label(m.type)}</Badge> },
    { key: 'qty', header: 'Qty', align: 'right', cell: m => num(m.quantity) },
    { key: 'avail', header: 'Available', align: 'right', hideable: true, cell: m => <span className="text-muted">{num(m.previousQuantity)} → {num(m.newQuantity)}</span> },
    { key: 'reserved', header: 'Reserved', align: 'right', hideable: true, cell: m => <span className="text-muted">{num(m.previousReserved)} → {num(m.newReserved)}</span> },
    { key: 'ref', header: 'Reference', hideable: true, cell: m => m.referenceType ? `${label(m.referenceType)} #${m.referenceId}` : '—' },
    { key: 'reason', header: 'Reason', hideable: true, cell: m => <span className="text-muted">{m.reason ?? '—'}</span> },
  ]
  return (
    <div>
      <PageHeader title="Stock movements" description="Append-only history of every stock change." />
      <FilterBar>
        <div className="w-40"><Input label="Product ID" inputMode="numeric" value={productId} onChange={e => { setPage(0); setParams(e.target.value.replace(/\D/g, '') ? { productId: e.target.value.replace(/\D/g, '') } : {}, { replace: true }) }} placeholder="All products" /></div>
        {productId && <Button variant="ghost" onClick={() => setParams({}, { replace: true })}>Clear filter</Button>}
      </FilterBar>
      <DataTable caption="Stock movements" storageKey="movements" columns={columns} rows={q.data?.content} rowKey={m => m.id} loading={q.isLoading} error={q.isError ? errorMessage(q.error) : null} onRetry={() => q.refetch()}
        emptyTitle="No movements found" emptyHint={productId ? 'This product has no recorded movements.' : 'Stock changes will appear here.'}
        page={page} totalPages={q.data?.totalPages} totalElements={q.data?.totalElements} onPage={setPage} />
    </div>)
}
