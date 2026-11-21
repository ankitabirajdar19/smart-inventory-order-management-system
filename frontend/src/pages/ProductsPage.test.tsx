import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductsPage } from './ProductsPage'
import { authFor, renderApp } from '../test/utils'

const h = vi.hoisted(() => ({ auth: null as unknown }))
const svc = vi.hoisted(() => ({ list: vi.fn(), cats: vi.fn(), add: vi.fn() }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => h.auth }))
vi.mock('../api/services', () => ({ productsApi: { list: svc.list }, categoriesApi: { list: svc.cats }, cartApi: { add: svc.add } }))

const product = (o = {}) => ({ id: 1, sku: 'SKU-1', name: 'Nova X1', brand: 'Nova', categoryId: 2, categoryName: 'Smartphones', price: 1000, discountPrice: 900, effectivePrice: 900, taxRate: 18, active: true, availableQuantity: 5, inStock: true, ...o })
const page = (content: unknown[]) => ({ content, page: 0, size: 12, totalElements: content.length, totalPages: 1 })

describe('Storefront ProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks(); h.auth = authFor(['CUSTOMER'])
    svc.cats.mockResolvedValue([{ id: 2, name: 'Smartphones', slug: 's', active: true }, { id: 3, name: 'Audio', slug: 'a', active: true }])
    svc.list.mockResolvedValue(page([product()])); svc.add.mockResolvedValue({})
  })

  it('lists products with price, discount and stock', async () => {
    renderApp(<ProductsPage />)
    expect(await screen.findByRole('link', { name: 'Nova X1' })).toBeInTheDocument()
    expect(screen.getByText('₹900.00')).toBeInTheDocument(); expect(screen.getByText('₹1,000.00')).toBeInTheDocument(); expect(screen.getByText('5 in stock')).toBeInTheDocument()
  })

  it('sends search, category and in-stock filters to the API', async () => {
    renderApp(<ProductsPage />); await screen.findByText('Nova X1')
    await userEvent.type(screen.getByRole('textbox', { name: 'Search products' }), 'phone')
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'phone' })))
    await userEvent.selectOptions(screen.getByLabelText('Category'), '3')
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: '3', q: 'phone' })))
    await userEvent.click(screen.getByRole('checkbox', { name: 'In stock only' }))
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ inStock: true })))
  })

  it('sorts via the API', async () => {
    renderApp(<ProductsPage />); await screen.findByText('Nova X1')
    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'price,asc')
    await waitFor(() => expect(svc.list).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'price', direction: 'asc' })))
  })

  it('adds a product to the cart through the cart API', async () => {
    renderApp(<ProductsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Add to cart' }))
    await waitFor(() => expect(svc.add).toHaveBeenCalledWith(1, 1))
  })

  it('disables Add to cart for out-of-stock products', async () => {
    svc.list.mockResolvedValue(page([product({ inStock: false, availableQuantity: 0 })]))
    renderApp(<ProductsPage />)
    expect(await screen.findByRole('button', { name: 'Add to cart' })).toBeDisabled(); expect(screen.getByText('Out of stock')).toBeInTheDocument()
  })

  it('shows empty and error states', async () => {
    svc.list.mockResolvedValueOnce(page([]))
    const { unmount } = renderApp(<ProductsPage />)
    expect(await screen.findByText('No products match')).toBeInTheDocument(); unmount()
    svc.list.mockRejectedValue(new Error('boom'))
    renderApp(<ProductsPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })
})
