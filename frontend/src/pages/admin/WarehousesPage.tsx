import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { warehousesApi } from '../../api/services'
import { errorMessage } from '../../api/client'
import type { Warehouse } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { type Column, DataTable } from '../../components/common/DataTable'
import { Dialog } from '../../components/common/Dialog'
import { PageHeader } from '../../components/common/PageHeader'
import { Button, Checkbox, Input, StatusBadge, useToast } from '../../components/ui'
import { warehouseSchema, type WarehouseForm } from '../../lib/schemas'

const blank: WarehouseForm = { name: '', code: '', location: '', address: '', contactNumber: '', active: true }

function WarehouseDialog({ open, warehouse, onClose }: { open: boolean; warehouse: Warehouse | null; onClose: () => void }) {
  const toast = useToast(); const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<WarehouseForm>({ resolver: zodResolver(warehouseSchema),
    values: warehouse ? { name: warehouse.name, code: warehouse.code, location: warehouse.location ?? '', address: warehouse.address ?? '', contactNumber: warehouse.contactNumber ?? '', active: warehouse.active } : blank })
  const m = useMutation({ mutationFn: (v: WarehouseForm) => (warehouse ? warehousesApi.update(warehouse.id, v) : warehousesApi.create(v)),
    onSuccess: () => { toast('ok', warehouse ? 'Warehouse updated' : 'Warehouse created'); qc.invalidateQueries({ queryKey: ['warehouses'] }); reset(blank); onClose() }, onError: e => toast('err', errorMessage(e)) })
  const close = () => { reset(blank); onClose() }; const submit = handleSubmit(v => m.mutate(v))
  return (
    <Dialog open={open} onClose={close} title={warehouse ? 'Edit warehouse' : 'New warehouse'}
      footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button loading={m.isPending} onClick={submit}>{warehouse ? 'Save changes' : 'Create warehouse'}</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Name" error={errors.name?.message} {...register('name')} /><Input label="Code" hint="Short unique code, e.g. WH-PUNE" error={errors.code?.message} {...register('code')} />
        <Input label="Location" error={errors.location?.message} {...register('location')} /><Input label="Contact number" error={errors.contactNumber?.message} {...register('contactNumber')} />
        <div className="sm:col-span-2"><Input label="Address" error={errors.address?.message} {...register('address')} /></div>
        <Checkbox label="Active" {...register('active')} />
      </form>
    </Dialog>)
}

export function WarehousesPage() {
  const { can } = useAuth(); const manage = can('WAREHOUSE_MANAGE')
  const q = useQuery({ queryKey: ['warehouses'], queryFn: warehousesApi.list })
  const [editing, setEditing] = useState<Warehouse | null>(null); const [creating, setCreating] = useState(false)
  const columns: Column<Warehouse>[] = [
    { key: 'name', header: 'Warehouse', cell: w => <span className="font-medium">{w.name}</span> },
    { key: 'code', header: 'Code', cell: w => <span className="text-muted">{w.code}</span> },
    { key: 'location', header: 'Location', hideable: true, cell: w => w.location ?? '—' },
    { key: 'contact', header: 'Contact', hideable: true, cell: w => w.contactNumber ?? '—' },
    { key: 'status', header: 'Status', cell: w => <StatusBadge status={w.active ? 'ACTIVE' : 'INACTIVE'} /> },
    { key: 'actions', header: '', align: 'right', cell: w => manage && <Button size="sm" variant="secondary" aria-label={`Edit ${w.name}`} onClick={() => setEditing(w)}>Edit</Button> },
  ]
  return (
    <div>
      <PageHeader title="Warehouses" description="Locations where stock is held." actions={manage && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" aria-hidden />New warehouse</Button>} />
      <DataTable caption="Warehouses" storageKey="warehouses" columns={columns} rows={q.data} rowKey={w => w.id} loading={q.isLoading} error={q.isError ? errorMessage(q.error) : null} onRetry={() => q.refetch()}
        emptyTitle="No warehouses yet" emptyHint="Create a warehouse before adding stock." />
      <WarehouseDialog open={creating || !!editing} warehouse={editing} onClose={() => { setCreating(false); setEditing(null) }} />
    </div>)
}
