import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Moon, PanelLeftClose, PanelLeftOpen, Menu, Search, Sun } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { useTheme } from '../../theme/ThemeContext'
import { Button } from '../ui'
import { AlertsMenu } from './AlertsMenu'
import { Breadcrumbs } from './Breadcrumbs'
import { UserMenu } from './UserMenu'

export function Topbar({ collapsed, onToggleCollapse, onOpenMobile }: { collapsed: boolean; onToggleCollapse: () => void; onOpenMobile: () => void }) {
  const { user, can, isStaff } = useAuth(); const { theme, toggle } = useTheme(); const nav = useNavigate(); const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {   // global search is a real product search: it opens the matching catalogue view
    e.preventDefault()
    const target = isStaff && (can('PRODUCT_WRITE') || can('INVENTORY_READ')) ? '/admin/products' : '/'
    nav(q.trim() ? `${target}?q=${encodeURIComponent(q.trim())}` : target)
  }
  const btn = 'rounded-lg p-2 text-muted hover:bg-subtle hover:text-fg'
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface/90 px-3 backdrop-blur sm:px-6">
      <button className={`${btn} lg:hidden`} aria-label="Open navigation menu" onClick={onOpenMobile}><Menu className="h-5 w-5" /></button>
      <button className={`${btn} hidden lg:block`} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={onToggleCollapse}>
        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}</button>
      <div className="hidden min-w-0 sm:block"><Breadcrumbs /></div>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <form role="search" onSubmit={submit} className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input aria-label="Search products" value={q} onChange={e => setQ(e.target.value)} placeholder="Search products or SKU…"
            className="h-9 w-64 rounded-lg border border-line bg-app pl-9 pr-3 text-sm placeholder:text-muted lg:w-72" />
        </form>
        <AlertsMenu />
        <button className={btn} onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button>
        {user ? <UserMenu /> : <div className="flex gap-2"><Link to="/login"><Button variant="secondary" size="sm">Sign in</Button></Link><Link to="/register" className="hidden sm:block"><Button size="sm">Register</Button></Link></div>}
      </div>
    </header>
  )
}
