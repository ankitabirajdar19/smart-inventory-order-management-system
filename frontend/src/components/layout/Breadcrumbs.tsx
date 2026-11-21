import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard', products: 'Products', categories: 'Categories', inventory: 'Inventory', warehouses: 'Warehouses',
  movements: 'Stock Movements', orders: 'Orders', cart: 'Cart', checkout: 'Checkout', profile: 'My Profile', login: 'Sign in', register: 'Register',
}

export function useCrumbs() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; to: string }[] = []
  let acc = ''
  parts.forEach(p => {
    acc += `/${p}`
    if (p === 'admin') return                       // "/admin" has no page of its own
    crumbs.push({ label: /^\d+$/.test(p) ? `#${p}` : LABELS[p] ?? p, to: acc })
  })
  return crumbs
}

export function Breadcrumbs() {
  const crumbs = useCrumbs()
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm text-muted">
        <li><Link to="/" aria-label="Home" className="hover:text-fg"><Home className="h-4 w-4" /></Link></li>
        {crumbs.map((c, i) => (
          <Fragment key={c.to}>
            <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
            <li className="min-w-0 truncate">{i === crumbs.length - 1 ? <span aria-current="page" className="font-medium text-fg">{c.label}</span> : <Link to={c.to} className="hover:text-fg">{c.label}</Link>}</li>
          </Fragment>))}
      </ol>
    </nav>
  )
}
