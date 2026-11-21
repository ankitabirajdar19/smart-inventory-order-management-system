// Typed wrappers over the backend REST API. Every path here exists in the Spring controllers.
import { api, unwrap } from './client'
import type { Address, Cart, Category, DashboardSummary, InventoryRow, Movement, Order, OrderSummary, Page, Payment, Product, User, Warehouse } from './types'

type Params = Record<string, string | number | boolean | undefined | null>
const clean = (p?: Params) => Object.fromEntries(Object.entries(p ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== ''))

export const productsApi = {
  list: (params?: Params) => unwrap<Page<Product>>(api.get('/products', { params: clean(params) })),
  adminList: (params?: Params) => unwrap<Page<Product>>(api.get('/admin/products', { params: clean(params) })),
  get: (id: number | string) => unwrap<Product>(api.get(`/products/${id}`)),
  create: (body: unknown) => unwrap<Product>(api.post('/admin/products', body)),
  update: (id: number, body: unknown) => unwrap<Product>(api.put(`/admin/products/${id}`, body)),
  archive: (id: number) => api.delete(`/admin/products/${id}`),
  exportCsv: () => api.get<Blob>('/admin/products/export', { responseType: 'blob' }).then(r => r.data),
  importCsv: (file: File) => { const fd = new FormData(); fd.append('file', file); return unwrap<{ created: number; skipped: number; errors: string[] }>(api.post('/admin/products/import', fd)) },
}
export const categoriesApi = {
  list: () => unwrap<Category[]>(api.get('/categories')),
  adminList: () => unwrap<Category[]>(api.get('/admin/categories')),
  create: (body: unknown) => unwrap<Category>(api.post('/admin/categories', body)),
  update: (id: number, body: unknown) => unwrap<Category>(api.put(`/admin/categories/${id}`, body)),
  remove: (id: number) => api.delete(`/admin/categories/${id}`),
}
export const warehousesApi = {
  list: () => unwrap<Warehouse[]>(api.get('/admin/warehouses')),
  create: (body: unknown) => unwrap<Warehouse>(api.post('/admin/warehouses', body)),
  update: (id: number, body: unknown) => unwrap<Warehouse>(api.put(`/admin/warehouses/${id}`, body)),
}
export const inventoryApi = {
  list: (params?: Params) => unwrap<Page<InventoryRow>>(api.get('/admin/inventory', { params: clean(params) })),
  byWarehouse: (id: number, params?: Params) => unwrap<Page<InventoryRow>>(api.get(`/admin/warehouses/${id}/inventory`, { params: clean(params) })),
  lowStock: (params?: Params) => unwrap<Page<InventoryRow>>(api.get('/admin/inventory/low-stock', { params: clean(params) })),
  movements: (params?: Params) => unwrap<Page<Movement>>(api.get('/admin/inventory/movements', { params: clean(params) })),
  adjust: (body: { productId: number; warehouseId: number; delta: number; reason: string }) => api.post('/admin/inventory/adjustments', body),
  transfer: (body: { productId: number; sourceWarehouseId: number; destinationWarehouseId: number; quantity: number; reason?: string }) => api.post('/admin/inventory/transfers', body),
}
export const cartApi = {
  get: () => unwrap<Cart>(api.get('/cart')),
  add: (productId: number, quantity = 1) => api.post('/cart/items', { productId, quantity }),
  setQuantity: (itemId: number, quantity: number) => api.put(`/cart/items/${itemId}`, { quantity }),
  remove: (itemId: number) => api.delete(`/cart/items/${itemId}`),
}
export const addressApi = {
  list: () => unwrap<Address[]>(api.get('/addresses')),
  create: (body: unknown) => unwrap<Address>(api.post('/addresses', body)),
}
export const ordersApi = {
  mine: (params?: Params) => unwrap<Page<OrderSummary>>(api.get('/orders', { params: clean(params) })),
  get: (id: number | string) => unwrap<Order>(api.get(`/orders/${id}`)),
  cancel: (id: number | string) => api.post(`/orders/${id}/cancel`, {}),
  place: (addressId: number | null, key: string) => unwrap<Order>(api.post('/orders', { addressId }, { headers: { 'Idempotency-Key': key } })),
  adminList: (params?: Params) => unwrap<Page<OrderSummary>>(api.get('/admin/orders', { params: clean(params) })),
  adminGet: (id: number | string) => unwrap<Order>(api.get(`/admin/orders/${id}`)),
  setStatus: (id: number, status: string, note?: string) => api.put(`/admin/orders/${id}/status`, { status, note }),
}
export const paymentsApi = {
  pay: (orderId: number, method: string, simulate: string, key: string) =>
    unwrap<Payment>(api.post('/payments', { orderId, method, simulate }, { headers: { 'Idempotency-Key': key } })),
}
export const dashboardApi = {
  summary: (params?: Params) => unwrap<DashboardSummary>(api.get('/admin/dashboard/summary', { params: clean(params) })),
}
export const profileApi = {
  update: (body: { fullName: string; phone?: string }) => unwrap<User>(api.put('/users/me', body)),
  changePassword: (body: { currentPassword: string; newPassword: string }) => api.put('/users/me/password', body),
}
