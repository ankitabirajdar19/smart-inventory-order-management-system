import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminOrdersPage } from './AdminOrdersPage'
import { authFor, renderApp } from '../../test/utils'

const h = vi.hoisted(() => ({ auth: null as unknown }))
const svc = vi.hoisted(() => ({ list: vi.fn(), setStatus: vi.fn() }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => h.auth }))
vi.mock('../../api/services', () => ({ ordersApi: { adminList: svc.list, setStatus: svc.setStatus } }))

const order = (o = {}) => ({ id: 1, orderNumber: 'ORD-1', customerId: 5, status: 'CONFIRMED', paymentStatus: 'SUCCESS', total: 2124, createdAt: '2026-11-18T09:00:00Z', ...o })
const page = (content: unknown[]) => ({ content, page: 0, size: 15, totalElements: content.length, totalPages: 1 })

describe('AdminOrdersPage', () => {
  beforeEach(() => { vi.clearAllMocks(); h.auth = authFor(['ADMIN'], ['ORDER_READ_ALL', 'ORDER_MANAGE']); svc.list.mockResolvedValue(page([order(), order({ id: 2, orderNumber: 'ORD-2', status: 'DELIVERED' })])); svc.setStatus.mockResolvedValue({}) })

  it('renders orders with status and totals', async () => {
    renderApp(<AdminOrdersPage />)
    expect(await screen.findByRole('link', { name: 'ORD-1' })).toHaveAttribute('href', '/admin/orders/1')
    expect(screen.getAllByText('₹2,124.00', { selector: 'td' })).toHaveLength(2); expect(within(screen.getByRole('table')).getByText('Delivered')).toBeInTheDocument()   // scoped: the status filter also has a Delivered option
  })

  it('only offers the valid next transition, and none for delivered orders', async () => {
    renderApp(<AdminOrdersPage />); await screen.findByText('ORD-1')
    expect(screen.getAllByRole('button', { name: /^Mark / })).toHaveLength(1); expect(screen.getByRole('button', { name: 'Mark processing' })).toBeInTheDocument()
  })

  it('confirms before advancing the status and then calls the API', async () => {
    renderApp(<AdminOrdersPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Mark processing' }))
    const dialog = screen.getByRole('dialog'); expect(svc.setStatus).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Update status' }))
    await waitFor(() => expect(svc.setStatus).toHaveBeenCalledWith(1, 'PROCESSING'))
  })

  it('passes status and date filters to the API', async () => {
    renderApp(<AdminOrdersPage />); await screen.findByText('ORD-1')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'PACKED')
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'PACKED' })))
    await userEvent.type(screen.getByLabelText('From'), '2026-11-01')
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-11-01' })))
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: '', from: '' })))
  })

  it('sorts by total through the API', async () => {
    renderApp(<AdminOrdersPage />); await screen.findByText('ORD-1')
    await userEvent.click(screen.getByRole('button', { name: /total/i }))
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'total', direction: 'asc' })))
  })

  it('hides fulfilment actions from read-only staff', async () => {
    h.auth = authFor(['STAFF'], ['ORDER_READ_ALL']); renderApp(<AdminOrdersPage />); await screen.findByText('ORD-1')
    expect(screen.queryByRole('button', { name: /^Mark / })).toBeNull()
  })

  it('shows empty and error states', async () => {
    svc.list.mockResolvedValueOnce(page([])); const { unmount } = renderApp(<AdminOrdersPage />)
    expect(await screen.findByText('No orders found')).toBeInTheDocument(); unmount()
    svc.list.mockRejectedValue(new Error('offline')); renderApp(<AdminOrdersPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('offline')
  })
})
