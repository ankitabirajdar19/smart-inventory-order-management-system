import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Boxes, ChevronDown } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { customerNav, publicNav, staffNav, visibleGroups } from '../../lib/nav'

/** Navigation is derived from permissions: a user only sees routes they may open AND that the backend supports. */
export function Sidebar({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { user, can, isStaff } = useAuth()
  const groups = !user ? publicNav : isStaff ? visibleGroups(staffNav, can) : customerNav
  const [closed, setClosed] = useState<Record<string, boolean>>({})

  return (
    <nav aria-label="Primary" className="flex h-full flex-col">
      <div className={`flex h-16 items-center gap-3 border-b border-line ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg"><Boxes className="h-5 w-5" aria-hidden /></div>
        {!collapsed && <div className="min-w-0 leading-tight"><p className="truncate text-sm font-semibold">Smart Inventory</p><p className="text-[10px] font-medium tracking-[0.14em] text-muted">INVENTORY MANAGEMENT</p></div>}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {groups.map(g => {
          const isClosed = !collapsed && closed[g.label]
          return (
            <div key={g.label} className="mb-4">
              {!collapsed && (
                <button onClick={() => setClosed(c => ({ ...c, [g.label]: !c[g.label] }))} aria-expanded={!isClosed}
                  className="mb-1 flex w-full items-center justify-between px-2 text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-fg">
                  {g.label}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${isClosed ? '-rotate-90' : ''}`} aria-hidden />
                </button>)}
              {!isClosed && <ul className="space-y-0.5">{g.items.map(i => (
                <li key={i.to}>
                  <NavLink to={i.to} end={i.end} onClick={onNavigate} title={collapsed ? i.label : undefined}
                    className={({ isActive }) => `group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-subtle hover:text-fg'}`}>
                    {({ isActive }) => (<>
                      {isActive && <span className="absolute -left-3 top-1.5 h-6 w-1 rounded-r bg-accent" aria-hidden />}
                      <i.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                      <span className={collapsed ? 'sr-only' : 'truncate'}>{i.label}</span>
                    </>)}
                  </NavLink>
                </li>))}</ul>}
            </div>)
        })}
      </div>
    </nav>
  )
}
