import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { ADMIN_PERMS, authFor, renderApp } from '../test/utils'

const h = vi.hoisted(() => ({ auth: null as unknown }))
const svc = vi.hoisted(() => ({
  summary: vi.fn(), adminList: vi.fn(), lowStock: vi.fn(), movements: vi.fn(), warehouses: vi.fn(),
}))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => h.auth }))
vi.mock('../api/services', () => ({
  dashboardApi: { summary: svc.summary }, ordersApi: { adminList: svc.adminList },
  inventoryApi: { lowStock: svc.lowStock, movements: svc.movements }, warehousesApi: { list: svc.warehouses },
}))

const page = (content: unknown[]) => ({ content, page: 0, size: 5, totalElements: content.length, totalPages: 1 })
const summary = (over: Record<string, unknown> = {}) => ({
  generatedAt: '2026-11-18T10:00:00Z', from: '2026-10-20', to: '2026-11-18',
  inventory: { totalProducts: 42, warehouses: 2, stockRecords: 80, availableUnits: 900, reservedUnits: 100, inventoryValue: 250000, lowStockRecords: 7, outOfStockRecords: 3 },
  sales: { ordersInPeriod: 10, previousOrders: 0, revenue: 5000, previousRevenue: 4000, revenueOrders: 8, averageOrderValue: 625, pendingOrders: 2 },
  daily: [{ day: '2026-11-17', orders: 4, revenue: 3000 }, { day: '2026-11-18', orders: 6, revenue: 2000 }],
  ordersByStatus: [{ status: 'CONFIRMED', count: 8 }, { status: 'PENDING', count: 2 }],
  topProducts: [{ productId: 1, name: 'Phone X', sku: 'SKU-1', units: 9, revenue: 4500 }],
  stockByWarehouse: [{ warehouseId: 1, name: 'Pune', available: 500, reserved: 50 }],
  ...over,
})

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks(); h.auth = authFor(['ADMIN'], ADMIN_PERMS)
    svc.adminList.mockResolvedValue(page([{ id: 7, orderNumber: 'ORD-20261118-ABCD1234', customerId: 3, status: 'CONFIRMED', paymentStatus: 'SUCCESS', total: 1200, createdAt: '2026-11-18T09:00:00Z' }]))
    svc.lowStock.mockResolvedValue(page([{ id: 1, productId: 1, sku: 'SKU-1', productName: 'Phone X', warehouseId: 1, warehouseName: 'Pune', availableQuantity: 2, reservedQuantity: 0, reorderLevel: 10, lowStock: true }]))
    svc.movements.mockResolvedValue(page([{ id: 1, productId: 1, warehouseId: 1, type: 'SALE_OUT', quantity: 1, previousQuantity: 5, newQuantity: 5, previousReserved: 1, newReserved: 0, createdAt: '2026-11-18T09:05:00Z' }]))
    svc.warehouses.mockResolvedValue([{ id: 1, name: 'Pune', code: 'WH-PUNE', active: true }])
  })

  it('renders KPIs from the API response, including a genuine trend', async () => {
    svc.summary.mockResolvedValue(summary())
    renderApp(<DashboardPage />)
    expect(screen.getByRole('heading', { name: 'Business Overview' })).toBeInTheDocument()
    expect(await screen.findByText('42')).toBeInTheDocument()                       // total products
    expect(screen.getByText('₹5,000.00')).toBeInTheDocument()                        // revenue
    expect(screen.getByText('25.0%')).toBeInTheDocument()                            // (5000-4000)/4000
    expect(screen.getByText('No prior-period data')).toBeInTheDocument()            // previous orders = 0: no invented percentage
    expect(screen.getByText('1,000')).toBeInTheDocument()                            // units = available + reserved
    expect(svc.summary).toHaveBeenCalledWith(expect.objectContaining({ from: expect.any(String), to: expect.any(String) }))
  })

  it('renders the activity panels from real endpoints', async () => {
    svc.summary.mockResolvedValue(summary())
    renderApp(<DashboardPage />)
    expect(await screen.findByRole('link', { name: 'ORD-20261118-ABCD1234' })).toBeInTheDocument()
    expect(screen.getByText('Customer #3')).toBeInTheDocument()
    expect((await screen.findAllByText('Phone X')).length).toBeGreaterThan(0)
    expect(await screen.findByText('Sale out')).toBeInTheDocument()
  })

  it('shows empty chart states instead of fabricating data', async () => {
    svc.summary.mockResolvedValue(summary({ daily: [{ day: '2026-11-18', orders: 0, revenue: 0 }], ordersByStatus: [], topProducts: [] }))
    renderApp(<DashboardPage />)
    expect(await screen.findByText('No revenue in this period')).toBeInTheDocument()
    expect(screen.getAllByText('No orders in this period')).toHaveLength(2)   // order activity + status breakdown
    expect(screen.getByText('No sales in this period')).toBeInTheDocument()
  })

  it('shows an error state and marks metrics unavailable when the API fails', async () => {
    svc.summary.mockRejectedValue(new Error('Summary service down'))
    renderApp(<DashboardPage />)
    await waitFor(() => expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Summary service down'))
    expect(screen.getAllByText('Unavailable').length).toBe(8)
  })

  it('hides panels the user has no permission to read', async () => {
    h.auth = authFor(['INVENTORY_MANAGER'], ['REPORT_VIEW', 'INVENTORY_READ']); svc.summary.mockResolvedValue(summary())
    renderApp(<DashboardPage />)
    await screen.findByText('42')
    expect(screen.queryByText('Recent orders')).toBeNull()
    expect(svc.adminList).not.toHaveBeenCalled()
    expect(screen.getByText('Low stock alerts')).toBeInTheDocument()
  })
})
