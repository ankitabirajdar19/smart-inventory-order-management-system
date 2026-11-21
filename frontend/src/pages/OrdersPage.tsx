import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, CircleX } from 'lucide-react'
import { ordersApi } from '../api/services'
import { errorMessage } from '../api/client'
import type { OrderSummary } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { ConfirmDialog } from '../components/common/Dialog'
import { type Column, DataTable } from '../components/common/DataTable'
import { PageHeader } from '../components/common/PageHeader'
import { Button, Card, ErrorState, Skeleton, StatusBadge, useToast } from '../components/ui'
import { dateTime, label, money } from '../lib/format'
import { CUSTOMER_CANCELLABLE, FLOW, NEXT_STATUS, STAFF_CANCELLABLE } from '../lib/orders'

export function OrdersPage() {
  const [page, setPage] = useState(0)
  const q = useQuery({ queryKey: ['orders', page], queryFn: () => ordersApi.mine({ page, size: 10 }) })
  const columns: Column<OrderSummary>[] = [
    { key: 'order', header: 'Order', cell: o => <Link className="font-medium text-accent hover:underline" to={`/orders/${o.id}`}>{o.orderNumber}</Link> },
    { key: 'date', header: 'Date', cell: o => <span className="text-muted">{dateTime(o.createdAt)}</span> },
    { key: 'payment', header: 'Payment', cell: o => <StatusBadge status={o.paymentStatus} /> },
    { key: 'status', header: 'Status', cell: o => <StatusBadge status={o.status} /> },
    { key: 'total', header: 'Total', align: 'right', cell: o => money(o.total) },
  ]
  return (
    <div>
      <PageHeader title="My orders" description="Track your orders and their payment status." />
      <DataTable caption="My orders" columns={columns} rows={q.data?.content} rowKey={o => o.id} loading={q.isLoading} error={q.isError ? errorMessage(q.error) : null} onRetry={() => q.refetch()}
        emptyTitle="No orders yet" emptyHint="Orders you place will appear here." page={page} totalPages={q.data?.totalPages} totalElements={q.data?.totalElements} onPage={setPage} />
    </div>)
}

function Stepper({ status }: { status: string }) {
  const idx = FLOW.indexOf(status)
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Order progress">
      {FLOW.map((s, i) => (
        <li key={s} className={`flex items-center gap-1.5 text-xs ${i <= idx ? 'font-medium text-fg' : 'text-muted'}`} aria-current={i === idx ? 'step' : undefined}>
          {i <= idx ? <CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> : <Circle className="h-4 w-4" aria-hidden />}{label(s)}</li>))}
    </ol>)
}

/** Shared by customers (/orders/:id) and staff (/admin/orders/:id). Status rules are enforced by the backend. */
export function OrderDetailPage({ admin = false }: { admin?: boolean }) {
  const { id } = useParams(); const qc = useQueryClient(); const toast = useToast(); const { can } = useAuth()
  const { state } = useLocation() as { state?: { placed?: boolean; cod?: boolean } }
  const [confirm, setConfirm] = useState<'cancel' | 'advance' | null>(null)
  const q = useQuery({ queryKey: [admin ? 'admin-order' : 'order', id], queryFn: () => (admin ? ordersApi.adminGet(id!) : ordersApi.get(id!)) })
  const refresh = () => { qc.invalidateQueries({ queryKey: [admin ? 'admin-order' : 'order', id] }); qc.invalidateQueries({ queryKey: [admin ? 'admin-orders' : 'orders'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); qc.invalidateQueries({ queryKey: ['inventory'] }) }
  const run = useMutation({
    mutationFn: async (action: 'cancel' | 'advance') => {
      const o = q.data!
      if (action === 'advance') return ordersApi.setStatus(o.id, NEXT_STATUS[o.status])
      return admin ? ordersApi.setStatus(o.id, 'CANCELLED', 'Cancelled by staff') : ordersApi.cancel(o.id)
    },
    onSuccess: (_d, a) => { toast('ok', a === 'cancel' ? 'Order cancelled' : 'Order status updated'); setConfirm(null); refresh() },
    onError: e => { toast('err', errorMessage(e)); setConfirm(null) },
  })
  if (q.isLoading) return <Skeleton className="h-96 w-full" />
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
  const o = q.data!
  let addr: Record<string, string> = {}
  try { addr = JSON.parse(o.shippingAddress) } catch { /* show nothing rather than crash on an unexpected snapshot */ }
  const canStaffAct = admin && (can('ORDER_MANAGE') || can('ORDER_FULFIL'))
  const next = canStaffAct ? NEXT_STATUS[o.status] : undefined
  const canCancel = admin ? can('ORDER_MANAGE') && STAFF_CANCELLABLE.includes(o.status) : CUSTOMER_CANCELLABLE.includes(o.status)

  return (
    <div className="space-y-5">
      <Link to={admin ? '/admin/orders' : '/orders'} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" aria-hidden />Back to orders</Link>
      {state?.placed && <div role="status" className="rounded-lg border border-success/30 bg-success-soft p-4 text-sm text-success">{state.cod ? 'Order placed. You will pay on delivery.' : 'Payment received. Your order is confirmed.'}</div>}
      <PageHeader title={o.orderNumber} description={`Placed ${dateTime(o.createdAt)}${admin ? ` · Customer #${o.customerId}` : ''}`}
        actions={<><StatusBadge status={o.status} /><StatusBadge status={o.paymentStatus} />
          {next && <Button onClick={() => setConfirm('advance')}>Mark as {label(next).toLowerCase()}</Button>}
          {canCancel && <Button variant="danger" onClick={() => setConfirm('cancel')}>Cancel order</Button>}</>} />
      {o.status === 'CANCELLED' ? <div className="flex items-center gap-2 rounded-lg bg-danger-soft p-4 text-sm text-danger"><CircleX className="h-4 w-4" aria-hidden />This order was cancelled.</div>
        : <Card className="p-4"><Stepper status={o.status} /></Card>}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="overflow-x-auto lg:col-span-2"><table className="w-full min-w-[420px] text-sm">
          <thead className="bg-subtle text-left text-xs uppercase tracking-wide text-muted"><tr><th scope="col" className="px-4 py-2.5">Item</th><th scope="col" className="px-4 py-2.5 text-right">Price</th><th scope="col" className="px-4 py-2.5 text-right">Qty</th><th scope="col" className="px-4 py-2.5 text-right">Total</th></tr></thead>
          <tbody className="divide-y divide-line">{o.items.map(i => <tr key={i.id}><td className="px-4 py-3">{i.productName}<span className="block text-xs text-muted">{i.sku}</span></td><td className="px-4 py-3 text-right">{money(i.unitPrice)}</td><td className="px-4 py-3 text-right">{i.quantity}</td><td className="px-4 py-3 text-right">{money(i.lineTotal)}</td></tr>)}</tbody></table></Card>
        <Card className="h-fit space-y-1.5 p-5 text-sm">
          <h2 className="mb-1 font-semibold">Payment</h2>
          {([['Subtotal', o.subtotal], ['Discount', -o.discount], ['Tax', o.tax], ['Shipping', o.shipping]] as [string, number][]).map(([k, v]) => <div key={k} className="flex justify-between text-muted"><span>{k}</span><span className="text-fg">{money(v)}</span></div>)}
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><span>Total</span><span>{money(o.total)}</span></div>
          {o.status === 'PENDING' && o.expiresAt && <p className="pt-2 text-xs text-muted">Unpaid orders are cancelled automatically at {dateTime(o.expiresAt)}.</p>}
        </Card>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-5 text-sm"><h2 className="mb-2 font-semibold">Shipping address</h2>{addr.fullName ? <p className="leading-relaxed">{addr.fullName}<br />{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />{addr.city}, {addr.state} {addr.postalCode}<br />{addr.phone}</p> : <p className="text-muted">Not available</p>}</Card>
        <Card className="p-5"><h2 className="mb-3 text-sm font-semibold">Order history</h2>
          <ol className="space-y-3 border-l border-line pl-4">{o.history.map((h, i) => (
            <li key={i} className="relative"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" aria-hidden /><StatusBadge status={h.to} /><p className="mt-0.5 text-xs text-muted">{dateTime(h.at)}{h.note ? ` · ${h.note}` : ''}</p></li>))}</ol></Card>
      </div>
      <ConfirmDialog open={confirm === 'cancel'} onClose={() => setConfirm(null)} onConfirm={() => run.mutate('cancel')} loading={run.isPending} danger title="Cancel this order?"
        description={o.status === 'PENDING' ? 'The reserved stock will be released.' : 'The stock will be returned and a paid order will be refunded.'} confirmLabel="Cancel order" />
      <ConfirmDialog open={confirm === 'advance'} onClose={() => setConfirm(null)} onConfirm={() => run.mutate('advance')} loading={run.isPending}
        title={`Mark as ${next ? label(next).toLowerCase() : ''}?`} description="The customer's tracking history will be updated." confirmLabel="Update status" />
    </div>)
}
