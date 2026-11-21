import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Package } from 'lucide-react'
import { cartApi, categoriesApi, productsApi } from '../api/services'
import { errorMessage } from '../api/client'
import type { Product } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { PageHeader, FilterBar } from '../components/common/PageHeader'
import { SearchInput } from '../components/common/SearchInput'
import { Badge, Button, Card, Checkbox, EmptyState, ErrorState, Pagination, Select, Skeleton, useToast } from '../components/ui'
import { money } from '../lib/format'

/** Add-to-cart behaviour shared by the grid and the detail page. */
export function useAddToCart() {
  const { user } = useAuth(); const nav = useNavigate(); const toast = useToast(); const qc = useQueryClient()
  const m = useMutation({
    mutationFn: (v: { id: number; qty: number }) => cartApi.add(v.id, v.qty),
    onSuccess: () => { toast('ok', 'Added to cart'); qc.invalidateQueries({ queryKey: ['cart'] }) },
    onError: e => toast('err', errorMessage(e)),
  })
  const canBuy = !user || user.roles.includes('CUSTOMER')
  return { canBuy, pending: m.isPending, add: (id: number, qty = 1) => { if (!user) { nav('/login'); return } m.mutate({ id, qty }) } }
}

export function ProductCard({ p }: { p: Product }) {
  const { canBuy, add, pending } = useAddToCart()
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Link to={`/products/${p.id}`} aria-label={`View ${p.name}`} className="flex h-36 items-center justify-center bg-subtle text-muted"><Package className="h-10 w-10" aria-hidden /></Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-muted">{p.categoryName}{p.brand ? ` · ${p.brand}` : ''}</p>
        <Link to={`/products/${p.id}`} className="mt-0.5 font-medium hover:text-accent">{p.name}</Link>
        <p className="mt-2 flex items-baseline gap-2"><span className="text-lg font-semibold">{money(p.effectivePrice)}</span>
          {p.discountPrice != null && <span className="text-sm text-muted line-through">{money(p.price)}</span>}</p>
        <div className="mt-1 mb-4"><Badge tone={p.inStock ? 'success' : 'danger'}>{p.inStock ? `${p.availableQuantity} in stock` : 'Out of stock'}</Badge></div>
        {canBuy && <Button className="mt-auto" disabled={!p.inStock} loading={pending} onClick={() => add(p.id)}>Add to cart</Button>}
      </div>
    </Card>)
}

export function ProductsPage() {
  const [params, setParams] = useSearchParams(); const q = params.get('q') ?? ''
  const [categoryId, setCategoryId] = useState(''); const [sort, setSort] = useState('createdAt,desc')
  const [inStock, setInStock] = useState(false); const [page, setPage] = useState(0)
  const cats = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const [sortBy, direction] = sort.split(',')
  const products = useQuery({
    queryKey: ['products', q, categoryId, sort, inStock, page],
    queryFn: () => productsApi.list({ q, categoryId, inStock: inStock || undefined, sortBy, direction, page, size: 12 }),
  })
  const setQ = (v: string) => { setPage(0); setParams(v ? { q: v } : {}, { replace: true }) }

  return (
    <div>
      <PageHeader title="Shop" description="Browse the catalogue and add products to your cart." />
      <FilterBar>
        <SearchInput className="min-w-52 flex-1" value={q} onChange={setQ} placeholder="Search by name or SKU" label="Search products" />
        <Select label="Category" value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(0) }} className="w-44"><option value="">All categories</option>{cats.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select label="Sort by" value={sort} onChange={e => setSort(e.target.value)} className="w-48">
          <option value="createdAt,desc">Newest</option><option value="price,asc">Price: low to high</option><option value="price,desc">Price: high to low</option><option value="name,asc">Name: A to Z</option></Select>
        <div className="pb-2"><Checkbox label="In stock only" checked={inStock} onChange={e => { setInStock(e.target.checked); setPage(0) }} /></div>
      </FilterBar>
      {products.isLoading ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <li key={i}><Skeleton className="h-72 w-full" /></li>)}</ul>
        : products.isError ? <ErrorState message={errorMessage(products.error)} onRetry={() => products.refetch()} />
        : products.data!.content.length === 0 ? <EmptyState title="No products match" hint="Try a different search or clear the filters." />
        : <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{products.data!.content.map(p => <li key={p.id}><ProductCard p={p} /></li>)}</ul>
            <div className="mt-6"><Pagination page={page} totalPages={products.data!.totalPages} total={products.data!.totalElements} onChange={setPage} /></div>
          </>}
    </div>)
}
