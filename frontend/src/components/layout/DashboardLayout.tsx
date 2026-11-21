import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('sidebar') === 'collapsed' } catch { return false } })
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) { setLastPath(pathname); setMobileOpen(false) }   // adjust state during render, not in an effect
  useEffect(() => { try { localStorage.setItem('sidebar', collapsed ? 'collapsed' : 'open') } catch { /* ignore */ } }, [collapsed])
  useEffect(() => {
    if (!mobileOpen) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key)
  }, [mobileOpen])

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg">Skip to content</a>
      <aside className={`sticky top-0 hidden h-screen shrink-0 border-r border-line bg-sidebar transition-[width] duration-200 lg:block ${collapsed ? 'w-[72px]' : 'w-64'}`}>
        <Sidebar collapsed={collapsed} />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Navigation menu" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-sidebar shadow-pop">
            <button onClick={() => setMobileOpen(false)} aria-label="Close navigation menu" className="absolute right-2 top-4 rounded-md p-1.5 text-muted hover:bg-subtle"><X className="h-5 w-5" /></button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>)}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} onOpenMobile={() => setMobileOpen(true)} />
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  )
}
