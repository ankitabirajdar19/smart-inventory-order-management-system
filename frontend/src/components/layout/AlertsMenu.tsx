import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { inventoryApi } from '../../api/services'
import { useAuth } from '../../auth/AuthContext'
import { Dropdown, MenuItem } from '../common/Dropdown'
import { StatusBadge } from '../ui'

/** Real stock alerts from /admin/inventory/low-stock (there is no generic notifications backend yet). */
export function AlertsMenu() {
  const { can } = useAuth(); const nav = useNavigate()
  const allowed = can('INVENTORY_READ')
  const q = useQuery({ queryKey: ['alerts', 'low-stock'], queryFn: () => inventoryApi.lowStock({ size: 5 }), enabled: allowed, refetchInterval: 60_000 })
  if (!allowed) return null
  const total = q.data?.totalElements ?? 0
  return (
    <Dropdown label={total ? `Stock alerts, ${total} items` : 'Stock alerts'} width="w-80" triggerClassName="relative rounded-lg p-2 text-muted hover:bg-subtle hover:text-fg"
      trigger={<><Bell className="h-[18px] w-[18px]" aria-hidden />{total > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{total > 99 ? '99+' : total}</span>}</>}>
      {close => (<>
        <p className="px-2.5 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wider text-muted">Stock alerts</p>
        {q.isError ? <p className="px-2.5 py-3 text-sm text-danger">Could not load alerts.</p>
          : !q.data?.content.length ? <p className="px-2.5 py-3 text-sm text-muted">No items are at or below their reorder level.</p>
          : q.data.content.map(r => (
            <MenuItem key={r.id} onClick={() => { close(); nav('/admin/inventory') }}>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{r.productName}</span><span className="block truncate text-xs text-muted">{r.warehouseName} · {r.availableQuantity} left (reorder at {r.reorderLevel})</span></span>
              <StatusBadge status={r.availableQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'} />
            </MenuItem>))}
        <button onClick={() => { close(); nav('/admin/inventory') }} className="mt-1 w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium text-accent hover:bg-subtle">View inventory</button>
      </>)}
    </Dropdown>
  )
}
