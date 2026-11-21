import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useSearchParams } from 'react-router-dom'
import { Download, Plus, Upload } from 'lucide-react'
import { categoriesApi, productsApi } from '../../api/services'
import { errorMessage } from '../../api/client'
import type { Product } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { ConfirmDialog, Dialog } from '../../components/common/Dialog'
import { type Column, DataTable, type SortState } from '../../components/common/DataTable'
import { FilterBar, PageHeader } from '../../components/common/PageHeader'
import { SearchInput } from '../../components/common/SearchInput'
import { Button, Checkbox, Input, Select, StatusBadge, useToast } from '../../components/ui'
import { money, num } from '../../lib/format'
import { productSchema, type ProductForm } from '../../lib/schemas'

const blank: ProductForm = { sku: '', name: '', brand: '', description: '', categoryId: '', price: '', discountPrice: '', taxRate: '18', active: true }

export function ProductFormDialog({ open, product, onClose }: { open: boolean; product: Product | null; onClose: () => void }) {
  const toast = useToast(); const qc = useQueryClient()
  const cats = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, enabled: open })
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>({ resolver: zodResolver(productSchema), values: product
    ? { sku: product.sku, name: product.name, brand: product.brand ?? '', description: product.description ?? '', categoryId: String(product.categoryId), price: String(product.price), discountPrice: product.discountPrice != null ? String(product.discountPrice) : '', taxRate: String(product.taxRate), active: product.active }
    : blank })
  const m = useMutation({
    mutationFn: (v: ProductForm) => {
      const body = { sku: v.sku.trim(), name: v.name.trim(), brand: v.brand || null, description: v.description || null, categoryId: Number(v.categoryId), price: Number(v.price),
        discountPrice: v.discountPrice ? Number(v.discountPrice) : null, taxRate: Number(v.taxRate), active: v.active }
      return product ? productsApi.update(product.id, body) : productsApi.create(body)
    },
    onSuccess: () => { toast('ok', product ? 'Product updated' : 'Product created'); qc.invalidateQueries({ queryKey: ['admin-products'] }); qc.invalidateQueries({ queryKey: ['products'] }); reset(blank); onClose() },
    onError: e => toast('err', errorMessage(e)),
  })
  const close = () => { reset(blank); onClose() }
  const submit = handleSubmit(v => m.mutate(v))
  return (
    <Dialog open={open} onClose={close} size="lg" title={product ? 'Edit product' : 'New product'} description="Prices are in INR. Tax is a percentage of the selling price."
      footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button loading={m.isPending} onClick={submit}>{product ? 'Save changes' : 'Create product'}</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="SKU" error={errors.sku?.message} {...register('sku')} /><Input label="Name" error={errors.name?.message} {...register('name')} />
        <Input label="Brand" error={errors.brand?.message} {...register('brand')} />
        <Select label="Category" error={errors.categoryId?.message} {...register('categoryId')}><option value="">Choose…</option>{cats.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Input label="List price" inputMode="decimal" error={errors.price?.message} {...register('price')} />
        <Input label="Discount price (optional)" inputMode="decimal" error={errors.discountPrice?.message} {...register('discountPrice')} />
        <Input label="Tax rate (%)" inputMode="decimal" error={errors.taxRate?.message} {...register('taxRate')} />
        <div className="flex items-end pb-2"><Checkbox label="Active (visible in the shop)" {...register('active')} /></div>
        <div className="sm:col-span-2"><Input label="Description" error={errors.description?.message} {...register('description')} /></div>
      </form>
    </Dialog>)
}

export function AdminProductsPage() {
  const { can } = useAuth(); const toast = useToast(); const qc = useQueryClient()
  const [params, setParams] = useSearchParams(); const search = params.get('q') ?? ''
  const [categoryId, setCategoryId] = useState(''); const [inStock, setInStock] = useState(''); const [page, setPage] = useState(0)
  const [sort, setSort] = useState<SortState>({ key: 'createdAt', dir: 'desc' })
  const [editing, setEditing] = useState<Product | null>(null); const [creating, setCreating] = useState(false); const [archiving, setArchiving] = useState<Product | null>(null)
  const write = can('PRODUCT_WRITE')
  const cats = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const q = useQuery({ queryKey: ['admin-products', search, categoryId, inStock, page, sort], queryFn: () => productsApi.adminList({ q: search, categoryId, inStock: inStock || undefined, page, size: 15, sortBy: sort.key, direction: sort.dir }) })
  const archive = useMutation({ mutationFn: (p: Product) => productsApi.archive(p.id),
    onSuccess: () => { toast('ok', 'Product archived'); setArchiving(null); qc.invalidateQueries({ queryKey: ['admin-products'] }); qc.invalidateQueries({ queryKey: ['products'] }) },
    onError: e => { toast('err', errorMessage(e)); setArchiving(null) } })

  const exportCsv = async () => {
    try { const blob = await productsApi.exportCsv(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'products.csv'; a.click(); URL.revokeObjectURL(a.href) }
    catch (e) { toast('err', errorMessage(e)) }
  }
  const importCsv = async (f: File | undefined) => {
    if (!f) return
    try { const r = await productsApi.importCsv(f); toast('ok', `Imported ${r.created} product(s), skipped ${r.skipped}`); qc.invalidateQueries({ queryKey: ['admin-products'] }) }
    catch (e) { toast('err', errorMessage(e)) }
  }

  const columns: Column<Product>[] = [
    { key: 'product', header: 'Product', sortKey: 'name', cell: p => <div><span className="font-medium">{p.name}</span>{p.brand && <span className="block text-xs text-muted">{p.brand}</span>}</div> },
    { key: 'sku', header: 'SKU', hideable: true, cell: p => <span className="text-muted">{p.sku}</span> },
    { key: 'category', header: 'Category', hideable: true, cell: p => p.categoryName },
    { key: 'price', header: 'Price', sortKey: 'price', align: 'right', cell: p => <>{money(p.effectivePrice)}{p.discountPrice != null && <span className="ml-1 text-xs text-muted line-through">{money(p.price)}</span>}</> },
    { key: 'stock', header: 'Stock', align: 'right', hideable: true, cell: p => num(p.availableQuantity) },
    { key: 'status', header: 'Status', cell: p => <StatusBadge status={!p.active ? 'INACTIVE' : p.inStock ? 'IN_STOCK' : 'OUT_OF_STOCK'} /> },
    { key: 'actions', header: '', align: 'right', cell: p => (
      <div className="flex justify-end gap-1.5">
        {p.active && <Link to={`/products/${p.id}`}><Button size="sm" variant="ghost" aria-label={`View ${p.name}`}>View</Button></Link>}
        {write && <Button size="sm" variant="secondary" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}>Edit</Button>}
        {write && <Button size="sm" variant="ghost" aria-label={`Archive ${p.name}`} onClick={() => setArchiving(p)}>Archive</Button>}
      </div>) },
  ]
  return (
    <div>
      <PageHeader title="Products" description="Manage the catalogue, pricing and availability."
        actions={write && <>
          <Button variant="secondary" onClick={exportCsv}><Download className="h-4 w-4" aria-hidden />Export CSV</Button>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-subtle"><Upload className="h-4 w-4" aria-hidden />Import CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={e => { importCsv(e.target.files?.[0]); e.target.value = '' }} /></label>
          <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden />New product</Button></>} />
      <FilterBar>
        <SearchInput className="min-w-52 flex-1" value={search} onChange={v => { setPage(0); setParams(v ? { q: v } : {}, { replace: true }) }} placeholder="Search by name or SKU" label="Search products" />
        <Select label="Category" value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(0) }} className="w-44"><option value="">All categories</option>{cats.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Select label="Availability" value={inStock} onChange={e => { setInStock(e.target.value); setPage(0) }} className="w-40"><option value="">All</option><option value="true">In stock</option></Select>
      </FilterBar>
      <DataTable caption="Products" storageKey="admin-products" columns={columns} rows={q.data?.content} rowKey={p => p.id} loading={q.isLoading} error={q.isError ? errorMessage(q.error) : null} onRetry={() => q.refetch()}
        emptyTitle="No products found" emptyHint="Try a different search or filter." emptyAction={write && <Button onClick={() => setCreating(true)}>Create a product</Button>}
        sort={sort} onSort={s => { setSort(s); setPage(0) }} page={page} totalPages={q.data?.totalPages} totalElements={q.data?.totalElements} onPage={setPage} />
      <ProductFormDialog open={creating || !!editing} product={editing} onClose={() => { setCreating(false); setEditing(null) }} />
      <ConfirmDialog open={!!archiving} onClose={() => setArchiving(null)} loading={archive.isPending} danger confirmLabel="Archive" onConfirm={() => archiving && archive.mutate(archiving)}
        title={`Archive ${archiving?.name ?? 'product'}?`} description="It will disappear from the shop. Existing orders and stock history are kept." />
    </div>)
}
