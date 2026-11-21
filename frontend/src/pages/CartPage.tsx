import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { cartApi } from '../api/services'
import { errorMessage } from '../api/client'
import { PageHeader } from '../components/common/PageHeader'
import { Button, Card, EmptyState, ErrorState, Skeleton, useToast } from '../components/ui'
import { money } from '../lib/format'

export function useCart() { return useQuery({ queryKey: ['cart'], queryFn: cartApi.get }) }

export const Row = ({ k, v, bold }: { k: string; v: number; bold?: boolean }) =>
  <div className={`flex justify-between ${bold ? 'text-base font-semibold' : 'text-muted'}`}><span>{k}</span><span className={bold ? '' : 'text-fg'}>{money(v)}</span></div>

export function CartPage() {
  const cart = useCart(); const qc = useQueryClient(); const toast = useToast()
  const done = { onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }), onError: (e: unknown) => toast('err', errorMessage(e)) }
  const setQty = useMutation({ mutationFn: (v: { id: number; quantity: number }) => cartApi.setQuantity(v.id, v.quantity), ...done })
  const remove = useMutation({ mutationFn: (id: number) => cartApi.remove(id), ...done })
  if (cart.isLoading) return <div className="grid gap-6 lg:grid-cols-3"><Skeleton className="h-64 lg:col-span-2" /><Skeleton className="h-64" /></div>
  if (cart.isError) return <ErrorState message={errorMessage(cart.error)} onRetry={() => cart.refetch()} />
  const { items, totals } = cart.data!
  if (!items.length) return <><PageHeader title="Your cart" /><EmptyState title="Your cart is empty" hint="Browse the shop to add products." action={<Link to="/"><Button>Browse products</Button></Link>} /></>
  return (
    <div>
      <PageHeader title="Your cart" description={`${items.length} item${items.length === 1 ? '' : 's'}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <ul className="space-y-3 lg:col-span-2">
          {items.map(i => (
            <li key={i.itemId}><Card className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-40 flex-1"><p className="font-medium">{i.name}</p><p className="text-xs text-muted">{i.sku} · {money(i.unitPrice)} each</p></div>
              <div className="flex items-center gap-2" role="group" aria-label={`Quantity for ${i.name}`}>
                <Button variant="secondary" size="sm" aria-label={`Decrease ${i.name}`} disabled={i.quantity <= 1 || setQty.isPending} onClick={() => setQty.mutate({ id: i.itemId, quantity: i.quantity - 1 })}>−</Button>
                <span className="w-8 text-center" aria-live="polite">{i.quantity}</span>
                <Button variant="secondary" size="sm" aria-label={`Increase ${i.name}`} disabled={i.quantity >= i.availableQuantity || setQty.isPending} onClick={() => setQty.mutate({ id: i.itemId, quantity: i.quantity + 1 })}>+</Button>
              </div>
              <p className="w-24 text-right font-medium">{money(i.lineTotal)}</p>
              <button aria-label={`Remove ${i.name}`} onClick={() => remove.mutate(i.itemId)} className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </Card></li>))}
        </ul>
        <Card className="h-fit space-y-2 p-5 text-sm">
          <h2 className="mb-1 font-semibold">Order summary</h2>
          <Row k="Subtotal" v={totals.subtotal} /><Row k="Discount" v={-totals.discount} /><Row k="Tax" v={totals.tax} /><Row k="Shipping" v={totals.shipping} />
          <div className="border-t border-line pt-2"><Row k="Total" v={totals.total} bold /></div>
          <Link to="/checkout" className="block pt-2"><Button className="w-full">Proceed to checkout</Button></Link>
          <p className="text-xs text-muted">Final prices are calculated by the server when you place the order.</p>
        </Card>
      </div>
    </div>)
}
