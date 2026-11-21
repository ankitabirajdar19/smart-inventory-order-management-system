import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { ThemeProvider } from '../theme/ThemeContext'
import { ToastProvider } from '../components/ui'

export function renderApp(ui: ReactElement, route = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}><MemoryRouter initialEntries={[route]}><ThemeProvider><ToastProvider>{ui}</ToastProvider></ThemeProvider></MemoryRouter></QueryClientProvider>)
}

export function authFor(roles: string[], permissions: string[] = []) {
  return {
    user: { id: 1, email: 'ada@example.com', fullName: 'Ada Admin', roles, permissions },
    loading: false, can: (p: string) => permissions.includes(p), isStaff: roles.some(r => r !== 'CUSTOMER'),
    login: vi.fn(), logout: vi.fn(), setUser: vi.fn(),
  }
}
export const ADMIN_PERMS = ['PRODUCT_WRITE', 'CATEGORY_WRITE', 'INVENTORY_READ', 'WAREHOUSE_MANAGE', 'ORDER_READ_ALL', 'ORDER_MANAGE', 'PAYMENT_REFUND', 'REPORT_VIEW']
