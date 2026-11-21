import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductFormDialog } from './AdminProductsPage'
import { renderApp } from '../../test/utils'

const svc = vi.hoisted(() => ({ cats: vi.fn(), create: vi.fn(), update: vi.fn() }))
vi.mock('../../api/services', () => ({ categoriesApi: { list: svc.cats }, productsApi: { create: svc.create, update: svc.update } }))

const existing = { id: 4, sku: 'SKU-4', name: 'Old name', brand: 'Nova', categoryId: 2, categoryName: 'Phones', price: 1000, discountPrice: 900, effectivePrice: 900, taxRate: 18, active: true, availableQuantity: 3, inStock: true, description: 'desc' }

describe('ProductFormDialog', () => {
  beforeEach(() => { vi.clearAllMocks(); svc.cats.mockResolvedValue([{ id: 2, name: 'Phones', slug: 'p', active: true }]); svc.create.mockResolvedValue({}); svc.update.mockResolvedValue({}) })

  it('validates required fields before any API call', async () => {
    renderApp(<ProductFormDialog open product={null} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }))
    expect(await screen.findByText('SKU is required')).toBeInTheDocument()
    for (const m of ['Name is required', 'Choose a category', /amount like 499/i]) expect(screen.getByText(m)).toBeInTheDocument()
    expect(svc.create).not.toHaveBeenCalled()
  })

  it('rejects a discount above the list price (mirrors the DB check constraint)', async () => {
    renderApp(<ProductFormDialog open product={null} onClose={vi.fn()} />)
    const d = screen.getByRole('dialog')
    await userEvent.type(within(d).getByLabelText('List price'), '100'); await userEvent.type(within(d).getByLabelText('Discount price (optional)'), '150')
    await userEvent.click(within(d).getByRole('button', { name: 'Create product' }))
    expect(await within(d).findByText('Cannot exceed the list price')).toBeInTheDocument()
  })

  it('creates a product with numeric values and closes', async () => {
    const onClose = vi.fn(); renderApp(<ProductFormDialog open product={null} onClose={onClose} />)
    const d = screen.getByRole('dialog')
    await userEvent.type(within(d).getByLabelText('SKU'), 'SKU-9'); await userEvent.type(within(d).getByLabelText('Name'), 'Phone')
    await within(d).findByRole('option', { name: 'Phones' }); await userEvent.selectOptions(within(d).getByLabelText('Category'), '2')
    await userEvent.type(within(d).getByLabelText('List price'), '999.50')
    await userEvent.click(within(d).getByRole('button', { name: 'Create product' }))
    await waitFor(() => expect(svc.create).toHaveBeenCalledWith({ sku: 'SKU-9', name: 'Phone', brand: null, description: null, categoryId: 2, price: 999.5, discountPrice: null, taxRate: 18, active: true }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('edits an existing product: prefilled, and updates by id', async () => {
    renderApp(<ProductFormDialog open product={existing} onClose={vi.fn()} />)
    const d = screen.getByRole('dialog', { name: 'Edit product' })
    expect(within(d).getByLabelText('SKU')).toHaveValue('SKU-4'); expect(within(d).getByLabelText('Discount price (optional)')).toHaveValue('900')
    const name = within(d).getByLabelText('Name'); await userEvent.clear(name); await userEvent.type(name, 'New name')
    await userEvent.click(within(d).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(svc.update).toHaveBeenCalledWith(4, expect.objectContaining({ name: 'New name', price: 1000, discountPrice: 900, categoryId: 2 })))
  })
})
