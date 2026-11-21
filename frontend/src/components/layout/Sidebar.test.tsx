import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from './Sidebar'
import { ADMIN_PERMS, authFor, renderApp } from '../../test/utils'

const h = vi.hoisted(() => ({ auth: null as unknown }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => h.auth }))
const links = () => screen.getAllByRole('link').map(l => l.textContent?.trim())

describe('Sidebar permission-based visibility', () => {
  it('shows an administrator every implemented admin route', () => {
    h.auth = authFor(['ADMIN'], ADMIN_PERMS); renderApp(<Sidebar />)
    expect(links()).toEqual(['Dashboard', 'Products', 'Categories', 'Inventory', 'Warehouses', 'Stock Movements', 'Orders'])
  })
  it('limits warehouse staff to the routes their permissions allow', () => {
    h.auth = authFor(['WAREHOUSE_STAFF'], ['INVENTORY_READ', 'ORDER_READ_ALL', 'ORDER_FULFIL']); renderApp(<Sidebar />)
    expect(links()).toEqual(['Products', 'Inventory', 'Warehouses', 'Stock Movements', 'Orders'])
    expect(screen.queryByRole('link', { name: 'Dashboard' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Categories' })).toBeNull()
  })
  it('shows customers only the storefront links and no admin routes', () => {
    h.auth = authFor(['CUSTOMER']); renderApp(<Sidebar />)
    expect(links()).toEqual(['Shop', 'Cart', 'My Orders'])
  })
  it('never links to modules the backend does not support yet', () => {
    h.auth = authFor(['SUPER_ADMIN'], ADMIN_PERMS); renderApp(<Sidebar />)
    for (const name of ['Suppliers', 'Purchase Orders', 'Analytics', 'Forecasting', 'Reports', 'Audit Logs', 'Settings', 'Users & Roles']) expect(screen.queryByText(name)).toBeNull()
  })
  it('keeps accessible names but hides visible labels when collapsed', () => {
    h.auth = authFor(['ADMIN'], ADMIN_PERMS); renderApp(<Sidebar collapsed />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.queryByText('INVENTORY MANAGEMENT')).toBeNull()
  })
})
