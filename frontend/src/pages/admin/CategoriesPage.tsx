import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { categoriesApi } from '../../api/services'
import { errorMessage } from '../../api/client'
import type { Category } from '../../api/types'
import { ConfirmDialog, Dialog } from '../../components/common/Dialog'
import { type Column, DataTable } from '../../components/common/DataTable'
import { PageHeader } from '../../components/common/PageHeader'
import { Button, Checkbox, Input, Select, StatusBadge, useToast } from '../../components/ui'
import { categorySchema, type CategoryForm } from '../../lib/schemas'

const blank: CategoryForm = { name: '', description: '', parentId: '', active: true }

function CategoryDialog({ open, category, all, onClose }: { open: boolean; category: Category | null; all: Category[]; onClose: () => void }) {
  const toast = useToast(); const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryForm>({ resolver: zodResolver(categorySchema),
    values: category ? { name: category.name, description: category.description ?? '', parentId: category.parentId ? String(category.parentId) : '', active: category.active } : blank })
  const m = useMutation({
    mutationFn: (v: CategoryForm) => { const body = { name: v.name, description: v.description || null, parentId: v.parentId ? Number(v.parentId) : null, active: v.active }; return category ? categoriesApi.update(category.id, body) : categoriesApi.create(body) },
    onSuccess: () => { toast('ok', category ? 'Category updated' : 'Category created'); qc.invalidateQueries({ queryKey: ['admin-categories'] }); qc.invalidateQueries({ queryKey: ['categories'] }); reset(blank); onClose() }, onError: e => toast('err', errorMessage(e)),
  })
  const close = () => { reset(blank); onClose() }; const submit = handleSubmit(v => m.mutate(v))
  return (
    <Dialog open={open} onClose={close} title={category ? 'Edit category' : 'New category'}
      footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button loading={m.isPending} onClick={submit}>{category ? 'Save changes' : 'Create category'}</Button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Name" error={errors.name?.message} {...register('name')} /><Input label="Description" error={errors.description?.message} {...register('description')} />
        <Select label="Parent category" {...register('parentId')}><option value="">None (top level)</option>{all.filter(c => c.id !== category?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <Checkbox label="Active" {...register('active')} />
      </form>
    </Dialog>)
}

export function CategoriesPage() {
  const toast = useToast(); const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin-categories'], queryFn: categoriesApi.adminList })
  const [editing, setEditing] = useState<Category | null>(null); const [creating, setCreating] = useState(false); const [deleting, setDeleting] = useState<Category | null>(null)
  const del = useMutation({ mutationFn: (c: Category) => categoriesApi.remove(c.id),
    onSuccess: () => { toast('ok', 'Category deleted'); setDeleting(null); qc.invalidateQueries({ queryKey: ['admin-categories'] }); qc.invalidateQueries({ queryKey: ['categories'] }) },
    onError: e => { toast('err', errorMessage(e)); setDeleting(null) } })
  const parentName = (id?: number | null) => q.data?.find(c => c.id === id)?.name ?? '—'
  const columns: Column<Category>[] = [
    { key: 'name', header: 'Category', cell: c => <span className="font-medium">{c.name}</span> },
    { key: 'slug', header: 'Slug', hideable: true, cell: c => <span className="text-muted">{c.slug}</span> },
    { key: 'parent', header: 'Parent', hideable: true, cell: c => parentName(c.parentId) },
    { key: 'desc', header: 'Description', hideable: true, cell: c => <span className="text-muted">{c.description ?? '—'}</span> },
    { key: 'status', header: 'Status', cell: c => <StatusBadge status={c.active ? 'ACTIVE' : 'INACTIVE'} /> },
    { key: 'actions', header: '', align: 'right', cell: c => <div className="flex justify-end gap-1.5"><Button size="sm" variant="secondary" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}>Edit</Button><Button size="sm" variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}>Delete</Button></div> },
  ]
  return (
    <div>
      <PageHeader title="Categories" description="Organise products. A category that still contains products cannot be deleted." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden />New category</Button>} />
      <DataTable caption="Categories" storageKey="categories" columns={columns} rows={q.data} rowKey={c => c.id} loading={q.isLoading} error={q.isError ? errorMessage(q.error) : null} onRetry={() => q.refetch()}
        emptyTitle="No categories yet" emptyAction={<Button onClick={() => setCreating(true)}>Create a category</Button>} />
      <CategoryDialog open={creating || !!editing} category={editing} all={q.data ?? []} onClose={() => { setCreating(false); setEditing(null) }} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} loading={del.isPending} danger confirmLabel="Delete" onConfirm={() => deleting && del.mutate(deleting)}
        title={`Delete ${deleting?.name ?? 'category'}?`} description="This cannot be undone. The server will refuse if products or child categories still use it." />
    </div>)
}
