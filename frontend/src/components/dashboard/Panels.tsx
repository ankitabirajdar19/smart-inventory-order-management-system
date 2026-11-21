import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { inventoryApi, ordersApi, warehousesApi } from '../../api/services'
import { errorMessage } from '../../api/client'
import { dateTime, label, money, num } from '../../lib/format'
import { Card, EmptyState, ErrorState, Skeleton, StatusBadge } from '../ui'

function Panel({ title, to, linkText, loading, error, empty, emptyText, children, onRetry }:
  { title: string; to: string; linkText: string; loading: boolean; error: string | null; empty: boolean; emptyText: string; children: ReactNode; onRetry: () => void }) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between"><h3 className="text-[15px] font-semibold">{title}</h3><Link to={to} className="text-xs font-medium text-accent hover:underline">{linkText}</Link></div>
      {loading ? <div className="space-y-2">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
        : error ? <ErrorState message={error} onRetry={onRetry} /> : empty ? <EmptyState title={emptyText} /> : <div className="overflow-x-auto">{children}</div>}
    </Card>)
}
const th = 'px-2 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted'
const td = 'px-2 py-2'

export function RecentOrdersPanel() {
  const q = useQuery({ queryKey: ['dashboard', 'recent-orders'], queryFn: () => ordersApi.adminList({ size: 5 }) })
  return (
    <Panel title="Recent orders" to="/admin/orders" linkText="View all" loading={q.isLoading} error={q.isError ? errorMessage(q.error) : null} empty={!q.data?.content.length} emptyText="No orders yet" onRetry={() => q.refetch()}>
      <table className="w-full min-w-[420px] text-sm"><thead><tr><th className={th}>Order</th><th className={th}>Customer</th><th className={th}>Date</th><th className={`${th} text-right`}>Amount</th><th className={th}>Status</th></tr></thead>
        <tbody className="divide-y divide-line">{q.data?.content.map(o => (
          <tr key={o.id}><td className={td}><Link className="font-medium text-accent hover:underline" to={`/admin/orders/${o.id}`}>{o.orderNumber}</Link></td><td className={td}>Customer #{o.customerId}</td>
            <td className={`${td} whitespace-nowrap text-muted`}>{dateTime(o.createdAt)}</td><td className={`${td} text-right`}>{money(o.total)}</td><td className={td}><StatusBadge status={o.status} /></td></tr>))}</tbody></table>
    </Panel>)
}

export function LowStockPanel() {
  const q = useQuery({ queryKey: ['dashboard', 'low-stock'], queryFn: () => inventoryApi.lowStock({ size: 5 }) })
  return (
    <Panel title="Low stock alerts" to="/admin/inventory" linkText="Manage stock" loading={q.isLoading} error={q.isError ? errorMessage(q.error) : null} empty={!q.data?.content.length} emptyText="Nothing is below its reorder level" onRetry={() => q.refetch()}>
      <table className="w-full min-w-[420px] text-sm"><thead><tr><th className={th}>Product</th><th className={th}>SKU</th><th className={`${th} text-right`}>Available</th><th className={`${th} text-right`}>Reorder at</th><th className={th}>Status</th></tr></thead>
        <tbody className="divide-y divide-line">{q.data?.content.map(r => (
          <tr key={r.id}><td className={td}><span className="font-medium">{r.productName}</span><span className="block text-xs text-muted">{r.warehouseName}</span></td><td className={`${td} text-muted`}>{r.sku}</td>
            <td className={`${td} text-right`}>{num(r.availableQuantity)}</td><td className={`${td} text-right`}>{num(r.reorderLevel)}</td>
            <td className={td}><StatusBadge status={r.availableQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'} /></td></tr>))}</tbody></table>
    </Panel>)
}

export function RecentMovementsPanel() {
  const q = useQuery({ queryKey: ['dashboard', 'movements'], queryFn: () => inventoryApi.movements({ size: 5 }) })
  const wh = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list })
  const name = (id: number) => wh.data?.find(w => w.id === id)?.name ?? `Warehouse #${id}`
  return (
    <Panel title="Recent inventory movements" to="/admin/movements" linkText="View all" loading={q.isLoading} error={q.isError ? errorMessage(q.error) : null} empty={!q.data?.content.length} emptyText="No stock movements yet" onRetry={() => q.refetch()}>
      <table className="w-full min-w-[460px] text-sm"><thead><tr><th className={th}>Product</th><th className={th}>Type</th><th className={`${th} text-right`}>Qty</th><th className={th}>Warehouse</th><th className={th}>Date</th></tr></thead>
        <tbody className="divide-y divide-line">{q.data?.content.map(m => (
          <tr key={m.id}><td className={td}>Product #{m.productId}</td><td className={td}>{label(m.type)}</td><td className={`${td} text-right`}>{num(m.quantity)}</td><td className={td}>{name(m.warehouseId)}</td><td className={`${td} whitespace-nowrap text-muted`}>{dateTime(m.createdAt)}</td></tr>))}</tbody></table>
    </Panel>)
}
