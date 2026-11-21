import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminInventoryPage } from './AdminInventoryPage'
import { authFor, renderApp } from '../../test/utils'

const h = vi.hoisted(() => ({ auth: null as unknown }))
const svc = vi.hoisted(() => ({ list: vi.fn(), low: vi.fn(), byWh: vi.fn(), adjust: vi.fn(), transfer: vi.fn(), wh: vi.fn(), summary: vi.fn() }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => h.auth }))
vi.mock('../../api/services', () => ({
  inventoryApi: { list: svc.list, lowStock: svc.low, byWarehouse: svc.byWh, adjust: svc.adjust, transfer: svc.transfer },
  warehousesApi: { list: svc.wh }, dashboardApi: { summary: svc.summary },
}))

const row = { id: 1, productId: 10, sku: 'SKU-10', productName: 'Phone', warehouseId: 1, warehouseName: 'Pune', availableQuantity: 5, reservedQuantity: 1, reorderLevel: 10, lowStock: true }
const page = (content: unknown[]) => ({ content, page: 0, size: 15, totalElements: content.length, totalPages: 1 })

describe('AdminInventoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks(); h.auth = authFor(['INVENTORY_MANAGER'], ['INVENTORY_READ', 'INVENTORY_WRITE'])
    svc.list.mockResolvedValue(page([row, { ...row, id: 2, productName: 'Cable', availableQuantity: 0 }, { ...row, id: 3, productName: 'Hub', availableQuantity: 50, lowStock: false }]))
    svc.low.mockResolvedValue(page([row])); svc.byWh.mockResolvedValue(page([row]))
    svc.wh.mockResolvedValue([{ id: 1, name: 'Pune', code: 'P', active: true }, { id: 2, name: 'Mumbai', code: 'M', active: true }])
    svc.adjust.mockResolvedValue({}); svc.transfer.mockResolvedValue({})
  })

  it('shows low, out-of-stock and in-stock indicators', async () => {
    renderApp(<AdminInventoryPage />); await screen.findByText('Phone')
    expect(screen.getByText('Low stock')).toBeInTheDocument(); expect(screen.getByText('Out of stock')).toBeInTheDocument(); expect(screen.getByText('In stock')).toBeInTheDocument()
  })

  it('validates the adjustment form before calling the API', async () => {
    renderApp(<AdminInventoryPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Adjust Phone in Pune' }))
    const dialog = screen.getByRole('dialog', { name: 'Adjust stock' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply adjustment' }))
    expect(await within(dialog).findByText(/whole number/i)).toBeInTheDocument(); expect(within(dialog).getByText('Give a short reason')).toBeInTheDocument()
    await userEvent.type(within(dialog).getByLabelText('Quantity change'), '0'); await userEvent.click(within(dialog).getByRole('button', { name: 'Apply adjustment' }))
    expect(await within(dialog).findByText('Must not be zero')).toBeInTheDocument()
    expect(svc.adjust).not.toHaveBeenCalled()
  })

  it('refuses to remove more stock than is available (server re-checks under lock)', async () => {
    renderApp(<AdminInventoryPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Adjust Phone in Pune' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Quantity change'), '-10'); await userEvent.type(within(dialog).getByLabelText('Reason'), 'Damaged')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply adjustment' }))
    expect(await within(dialog).findByText('Cannot remove more than the 5 available')).toBeInTheDocument(); expect(svc.adjust).not.toHaveBeenCalled()
  })

  it('submits a valid adjustment to the API and closes the dialog', async () => {
    renderApp(<AdminInventoryPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Adjust Phone in Pune' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Quantity change'), '20'); await userEvent.type(within(dialog).getByLabelText('Reason'), 'Cycle count')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apply adjustment' }))
    await waitFor(() => expect(svc.adjust).toHaveBeenCalledWith({ productId: 10, warehouseId: 1, delta: 20, reason: 'Cycle count' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('transfers stock to another warehouse', async () => {
    renderApp(<AdminInventoryPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Transfer Phone from Pune' }))
    const dialog = screen.getByRole('dialog', { name: 'Transfer stock' })
    await userEvent.selectOptions(await within(dialog).findByLabelText('Destination warehouse'), '2'); await userEvent.type(within(dialog).getByLabelText('Quantity'), '3')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Transfer' }))
    await waitFor(() => expect(svc.transfer).toHaveBeenCalledWith({ productId: 10, sourceWarehouseId: 1, destinationWarehouseId: 2, quantity: 3, reason: undefined }))
  })

  it('uses the low-stock endpoint for the "needs attention" view', async () => {
    renderApp(<AdminInventoryPage />); await screen.findByText('Phone')
    await userEvent.selectOptions(screen.getByLabelText('View'), 'low')
    await waitFor(() => expect(svc.low).toHaveBeenCalled())
    expect(screen.getByLabelText('Warehouse')).toBeDisabled()
  })

  it('hides write actions without INVENTORY_WRITE but keeps history', async () => {
    h.auth = authFor(['WAREHOUSE_STAFF'], ['INVENTORY_READ']); renderApp(<AdminInventoryPage />); await screen.findByText('Phone')
    expect(screen.queryByRole('button', { name: /Adjust Phone/ })).toBeNull(); expect(screen.getByRole('button', { name: 'History for Phone' })).toBeInTheDocument()
  })

  it('shows an error state with retry', async () => {
    svc.list.mockRejectedValue(new Error('db unavailable'))
    renderApp(<AdminInventoryPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('db unavailable'); expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
