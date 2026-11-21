import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Package } from 'lucide-react'
import { productsApi } from '../api/services'
import { errorMessage } from '../api/client'
import { Badge, Button, Card, ErrorState, Skeleton } from '../components/ui'
import { money } from '../lib/format'
import { useAddToCart } from './ProductsPage'

export function ProductDetailPage() {
  const { id } = useParams(); const { canBuy, add, pending } = useAddToCart(); const [qty, setQty] = useState(1)
  const q = useQuery({ queryKey: ['product', id], queryFn: () => productsApi.get(id!) })
  if (q.isLoading) return <div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
  const p = q.data!
  return (
    <div>
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"><ArrowLeft className="h-4 w-4" aria-hidden />Back to shop</Link>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex min-h-72 items-center justify-center overflow-hidden bg-subtle">
          {p.imageUrls?.[0] ? <img src={p.imageUrls[0]} alt={p.name} className="max-h-96 w-full object-contain" /> : <Package className="h-16 w-16 text-muted" aria-hidden />}
        </Card>
        <div>
          <p className="text-sm text-muted">{p.categoryName}{p.brand ? ` · ${p.brand}` : ''}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{p.name}</h1>
          <p className="mt-1 text-xs text-muted">SKU {p.sku}</p>
          <p className="mt-4 flex items-baseline gap-3"><span className="text-3xl font-semibold">{money(p.effectivePrice)}</span>{p.discountPrice != null && <span className="text-muted line-through">{money(p.price)}</span>}</p>
          <p className="mt-1 text-xs text-muted">Prices exclude {p.taxRate}% tax; final totals are calculated at checkout.</p>
          <div className="mt-3"><Badge tone={p.inStock ? 'success' : 'danger'}>{p.inStock ? `${p.availableQuantity} in stock` : 'Out of stock'}</Badge></div>
          {p.description && <p className="mt-5 whitespace-pre-line text-sm leading-relaxed">{p.description}</p>}
          {canBuy && (
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center gap-2" role="group" aria-label="Quantity">
                <Button variant="secondary" size="sm" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty(n => n - 1)}>−</Button>
                <span className="w-8 text-center" aria-live="polite">{qty}</span>
                <Button variant="secondary" size="sm" aria-label="Increase quantity" disabled={qty >= p.availableQuantity} onClick={() => setQty(n => n + 1)}>+</Button>
              </div>
              <Button disabled={!p.inStock} loading={pending} onClick={() => add(p.id, qty)}>Add to cart</Button>
            </div>)}
        </div>
      </div>
    </div>)
}
