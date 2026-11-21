import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Boxes, PackageCheck, PackageX, TriangleAlert, Layers } from 'lucide-react'
import { dashboardApi, inventoryApi, warehousesApi } from '../../api/services'
import { errorMessage } from '../../api/client'
import type { InventoryRow } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { StatCard } from '../../components/dashboard/StatCard'
import { type Column, DataTable } from '../../components/common/DataTable'
import { Dialog } from '../../components/common/Dialog'
import { FilterBar, PageHeader } from '../../components/common/PageHeader'
import { Button, Input, Select, StatusBadge, useToast } from '../../components/ui'
import { num } from '../../lib/format'
import { adjustSchema, transferSchema, type AdjustForm, type TransferForm } from '../../lib/schemas'

const stockStatus = (r: InventoryRow) => (r.availableQuantity === 0 ? 'OUT_OF_STOCK' : r.lowStock ? 'LOW_STOCK' : 'IN_STOCK')

function useRefreshStock() {
  const qc = useQueryClient()
  return () => { for (const k of ['inventory', 'alerts', 'dashboard', 'movements']) qc.invalidateQueries({ queryKey: [k] }) }
}

export function AdjustDialog({ row, onClose }: { row: InventoryRow | null; onClose: () => void }) {
  const toast = useToast(); const refresh = useRefreshStock()
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<AdjustForm>({ resolver: zodResolver(adjustSchema) })
  const m = useMutation({
    mutationFn: (v: AdjustForm) => inventoryApi.adjust({ productId: row!.productId, warehouseId: row!.warehouseId, delta: Number(v.delta), reason: v.reason }),
    onSuccess: () => { toast('ok', 'Stock adjusted'); refresh(); reset(); onClose() }, onError: e => toast('err', errorMessage(e)),
  })
  const submit = handleSubmit(v => {
    // Convenience check only; the server re-validates under a row lock and never lets stock go negative.
    if (row && Number(v.delta) < -row.availableQuantity) { setError('delta', { message: `Cannot remove more than the ${row.availableQuantity} available` }); return }
    m.mutate(v)
  })
  return (
    <Dialog open={!!row} onClose={() => { reset(); onClose() }} title="Adjust stock" description={row ? `${row.productName} · ${row.warehouseName} · ${row.availableQuantity} available` : undefined}
      footer={<><Button variant="secondary" onClick={() => { reset(); onClose() }}>Cancel</Button><Button loading={m.isPending} onClick={submit}>Apply adjustment</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Quantity change" inputMode="numeric" hint="Use a negative number to remove stock." error={errors.delta?.message} {...register('delta')} />
        <Input label="Reason" error={errors.reason?.message} {...register('reason')} />
      </form>
    </Dialog>)
}

export function TransferDialog({ row, onClose }: { row: InventoryRow | null; onClose: () => void }) {
  const toast = useToast(); const refresh = useRefreshStock()
  const wh = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list, enabled: !!row })
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<TransferForm>({ resolver: zodResolver(transferSchema) })
  const m = useMutation({
    mutationFn: (v: TransferForm) => inventoryApi.transfer({ productId: row!.productId, sourceWarehouseId: row!.warehouseId, destinationWarehouseId: Number(v.destinationWarehouseId), quantity: Number(v.quantity), reason: v.reason || undefined }),
    onSuccess: () => { toast('ok', 'Stock transferred'); refresh(); reset(); onClose() }, onError: e => toast('err', errorMessage(e)),
  })
  const submit = handleSubmit(v => {
    if (row && Number(v.quantity) > row.availableQuantity) { setError('quantity', { message: `Only ${row.availableQuantity} available to transfer` }); return }
    m.mutate(v)
  })
  const others = wh.data?.filter(w => w.active && w.id !== row?.warehouseId) ?? []
  return (
    <Dialog open={!!row} onClose={() => { reset(); onClose() }} title="Transfer stock" description={row ? `${row.productName} from ${row.warehouseName} (${row.availableQuantity} available)` : undefined}
      footer={<><Button variant="secondary" onClick={() => { reset(); onClose() }}>Cancel</Button><Button loading={m.isPending} onClick={submit}>Transfer</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Select label="Destination warehouse" error={errors.destinationWarehouseId?.message} {...register('destinationWarehouseId')}><option value="">Choose…</option>{others.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
        <Input label="Quantity" inputMode="numeric" error={errors.quantity?.message} {...register('quantity')} />
        <Input label="Reason (optional)" error={errors.reason?.message} {...register('reason')} />
      </form>
    </Dialog>)
}

export function AdminInventoryPage() {
  const { can } = useAuth()
  const [view, setView] = useState<'all' | 'low'>('all'); const [warehouseId, setWarehouseId] = useState(''); const [page, setPage] = useState(0)
  const [adjust, setAdjust] = useState<InventoryRow | null>(null); const [transfer, setTransfer] = useState<InventoryRow | null>(null)
  const wh = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list })
  const summary = useQuery({ queryKey: ['dashboard', 'summary', 'inventory-page'], queryFn: () => dashboardApi.summary(), enabled: can('REPORT_VIEW') })
  const q = useQuery({
    queryKey: ['inventory', view, warehouseId, page],
    queryFn: () => view === 'low' ? inventoryApi.lowStock({ page, size: 15 }) : warehouseId ? inventoryApi.byWarehouse(Number(warehouseId), { page, size: 15 }) : inventoryApi.list({ page, size: 15 }),
  })
  const write = can('INVENTORY_WRITE'); const inv = summary.data?.inventory

  const columns: Column<InventoryRow>[] = [
    { key: 'product', header: 'Product', cell: r => <span className="font-medium">{r.productName}</span> },
    { key: 'sku', header: 'SKU', hideable: true, cell: r => <span className="text-muted">{r.sku}</span> },
    { key: 'warehouse', header: 'Warehouse', hideable: true, cell: r => r.warehouseName },
    { key: 'available', header: 'Available', align: 'right', cell: r => num(r.availableQuantity) },
    { key: 'reserved', header: 'Reserved', align: 'right', hideable: true, cell: r => num(r.reservedQuantity) },
    { key: 'reorder', header: 'Reorder level', align: 'right', hideable: true, cell: r => num(r.reorderLevel) },
    { key: 'status', header: 'Status', cell: r => <StatusBadge status={stockStatus(r)} /> },
    { key: 'actions', header: '', align: 'right', cell: r => (
      <div className="flex justify-end gap-1.5">
        {write && <Button size="sm" variant="secondary" aria-label={`Adjust ${r.productName} in ${r.warehouseName}`} onClick={() => setAdjust(r)}>Adjust</Button>}
        {write && <Button size="sm" variant="ghost" aria-label={`Transfer ${r.productName} from ${r.warehouseName}`} onClick={() => setTransfer(r)}>Transfer</Button>}
        <Link to={`/admin/movements?productId=${r.productId}`}><Button size="sm" variant="ghost" aria-label={`History for ${r.productName}`}>History</Button></Link>
      </div>) },
  ]
  return (
    <div>
      <PageHeader title="Inventory" description="Stock levels by product and warehouse. All changes are recorded in the movement history." />
      {inv && <section aria-label="Inventory metrics" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={Boxes} label="Total stock" value={num(inv.availableUnits + inv.reservedUnits)} />
        <StatCard icon={PackageCheck} label="Available" value={num(inv.availableUnits)} />
        <StatCard icon={Layers} label="Reserved" value={num(inv.reservedUnits)} />
        <StatCard icon={TriangleAlert} label="Low stock" value={num(inv.lowStockRecords)} hint="records" />
        <StatCard icon={PackageX} label="Out of stock" value={num(inv.outOfStockRecords)} hint="records" />
      </section>}
      <FilterBar>
        <Select label="View" value={view} onChange={e => { setView(e.target.value as 'all' | 'low'); setPage(0) }} className="w-48"><option value="all">All stock</option><option value="low">Needs attention (low or out)</option></Select>
        <Select label="Warehouse" value={warehouseId} disabled={view === 'low'} onChange={e => { setWarehouseId(e.target.value); setPage(0) }} className="w-48"><option value="">All warehouses</option>{wh.data?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
      </FilterBar>
      <DataTable caption="Inventory" storageKey="inventory" columns={columns} rows={q.data?.content} rowKey={r => r.id} loading={q.isLoading} error={q.isError ? errorMessage(q.error) : null} onRetry={() => q.refetch()}
        emptyTitle={view === 'low' ? 'Nothing needs attention' : 'No inventory records'} emptyHint={view === 'low' ? 'Every item is above its reorder level.' : 'Adjust stock for a product to create its first record.'}
        page={page} totalPages={q.data?.totalPages} totalElements={q.data?.totalElements} onPage={setPage} />
      <AdjustDialog row={adjust} onClose={() => setAdjust(null)} />
      <TransferDialog row={transfer} onClose={() => setTransfer(null)} />
    </div>)
}
