import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CheckoutPage } from './CheckoutPage'
import { renderApp } from '../test/utils'

const svc = vi.hoisted(() => ({ cart: vi.fn(), addresses: vi.fn(), place: vi.fn(), pay: vi.fn(), createAddress: vi.fn() }))
vi.mock('../api/services', () => ({
  cartApi: { get: svc.cart }, addressApi: { list: svc.addresses, create: svc.createAddress },
  ordersApi: { place: svc.place }, paymentsApi: { pay: svc.pay },
}))

const cart = { items: [{ itemId: 1, productId: 1, name: 'Phone', sku: 'S', listPrice: 1000, unitPrice: 900, quantity: 2, lineTotal: 1800, availableQuantity: 5 }],
  totals: { subtotal: 2000, discount: 200, tax: 324, shipping: 0, total: 2124 } }
const address = { id: 1, fullName: 'Ada', phone: '9999999999', line1: '1 Road', city: 'Pune', state: 'MH', postalCode: '411001', country: 'India', defaultAddress: true }
const order = { id: 9, orderNumber: 'ORD-9', total: 2124 }
const app = () => renderApp(<Routes><Route path="/checkout" element={<CheckoutPage />} /><Route path="/orders/:id" element={<p>order page</p>} /></Routes>, '/checkout')

describe('CheckoutPage (idempotent order + payment flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks(); svc.cart.mockResolvedValue(cart); svc.addresses.mockResolvedValue([address]); svc.place.mockResolvedValue(order)
    svc.pay.mockResolvedValue({ id: 5, orderId: 9, status: 'SUCCESS', amount: 2124, transactionReference: 'T' })
  })

  it('shows server-calculated totals and places the order then pays, with idempotency keys', async () => {
    app()
    expect(await screen.findByText('₹2,124.00')).toBeInTheDocument()              // total comes from the cart API, not the browser
    await userEvent.click(screen.getByRole('button', { name: 'Pay now' }))
    await screen.findByText('order page')
    expect(svc.place).toHaveBeenCalledWith(1, expect.stringMatching(/^[0-9a-f-]{36}$/))
    expect(svc.pay).toHaveBeenCalledWith(9, 'UPI', 'SUCCESS', expect.stringMatching(/^[0-9a-f-]{36}$/))
  })

  it('after a failed payment keeps the SAME order (no duplicate) and retries with a NEW payment key', async () => {
    svc.pay.mockResolvedValueOnce({ id: 5, orderId: 9, status: 'FAILED', failureReason: 'Declined by issuer', amount: 2124, transactionReference: 'T' })
    app()
    await userEvent.click(await screen.findByRole('button', { name: 'Pay now' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Declined by issuer')
    await userEvent.click(screen.getByRole('button', { name: 'Retry payment' }))
    await screen.findByText('order page')
    expect(svc.place).toHaveBeenCalledTimes(1)                                      // order not re-created
    expect(svc.pay).toHaveBeenCalledTimes(2)
    expect(svc.pay.mock.calls[0][3]).not.toEqual(svc.pay.mock.calls[1][3])          // fresh idempotency key for the new attempt
  })

  it('uses cash on delivery without a card step', async () => {
    app(); await userEvent.click(await screen.findByRole('radio', { name: 'Cash on delivery' }))
    await userEvent.click(screen.getByRole('button', { name: 'Place order' }))
    await waitFor(() => expect(svc.pay).toHaveBeenCalledWith(9, 'COD', 'SUCCESS', expect.any(String)))
  })

  it('blocks checkout until an address exists', async () => {
    svc.addresses.mockResolvedValue([]); app()
    expect(await screen.findByRole('button', { name: 'Pay now' })).toBeDisabled(); expect(screen.getByText('Add a delivery address to continue.')).toBeInTheDocument()
  })

  it('validates a new address before calling the API', async () => {
    svc.addresses.mockResolvedValue([]); app()
    await userEvent.click(await screen.findByRole('button', { name: 'Save address' }))
    expect(await screen.findByText('Enter a valid postal code')).toBeInTheDocument(); expect(svc.createAddress).not.toHaveBeenCalled()
  })

  it('shows an empty state when the cart is empty', async () => {
    svc.cart.mockResolvedValue({ items: [], totals: { subtotal: 0, discount: 0, tax: 0, shipping: 0, total: 0 } }); app()
    expect(await screen.findByText('Nothing to check out')).toBeInTheDocument()
  })
})
