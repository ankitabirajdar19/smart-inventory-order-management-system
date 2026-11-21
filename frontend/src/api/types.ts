export interface ApiEnvelope<T> { success: boolean; message?: string; data: T }
export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface User { id: number; email: string; fullName: string; phone?: string; roles: string[]; permissions: string[] }
export interface TokenResponse { accessToken: string; expiresInSeconds: number; user: User }
export interface Category { id: number; name: string; slug: string; description?: string; parentId?: number | null; active: boolean }
export interface Product {
  id: number; sku: string; name: string; description?: string; brand?: string; categoryId: number; categoryName: string
  price: number; discountPrice?: number | null; effectivePrice: number; taxRate: number; active: boolean
  availableQuantity: number; inStock: boolean; imageUrls?: string[]; createdAt?: string
}
export interface CartItem { itemId: number; productId: number; name: string; sku: string; listPrice: number; unitPrice: number; quantity: number; lineTotal: number; availableQuantity: number }
export interface CartTotals { subtotal: number; discount: number; tax: number; shipping: number; total: number }
export interface Cart { items: CartItem[]; totals: CartTotals }
export interface Address { id: number; fullName: string; phone: string; line1: string; line2?: string; city: string; state: string; postalCode: string; country: string; defaultAddress: boolean }
export interface OrderSummary { id: number; orderNumber: string; customerId: number; status: string; paymentStatus: string; total: number; createdAt: string }
export interface OrderItem { id: number; productName: string; sku: string; unitPrice: number; quantity: number; lineTotal: number }
export interface Order extends OrderSummary {
  subtotal: number; discount: number; tax: number; shipping: number; shippingAddress: string; expiresAt?: string
  items: OrderItem[]; history: { from?: string; to: string; at: string; note?: string }[]
}
export interface Payment { id: number; orderId: number; status: string; amount: number; transactionReference: string; failureReason?: string }
export interface InventoryRow { id: number; productId: number; sku: string; productName: string; warehouseId: number; warehouseName: string; availableQuantity: number; reservedQuantity: number; reorderLevel: number; lowStock: boolean }
export interface Warehouse { id: number; name: string; code: string; location?: string; address?: string; contactNumber?: string; active: boolean }
export interface Movement { id: number; productId: number; warehouseId: number; type: string; quantity: number; previousQuantity: number; newQuantity: number; previousReserved: number; newReserved: number; referenceType?: string; referenceId?: number; reason?: string; performedBy?: number; createdAt: string }

export interface DashboardSummary {
  generatedAt: string; from: string; to: string
  inventory: { totalProducts: number; warehouses: number; stockRecords: number; availableUnits: number; reservedUnits: number; inventoryValue: number; lowStockRecords: number; outOfStockRecords: number }
  sales: { ordersInPeriod: number; previousOrders: number; revenue: number; previousRevenue: number; revenueOrders: number; averageOrderValue: number; pendingOrders: number }
  daily: { day: string; orders: number; revenue: number }[]
  ordersByStatus: { status: string; count: number }[]
  topProducts: { productId: number; name: string; sku: string; units: number; revenue: number }[]
  stockByWarehouse: { warehouseId: number; name: string; available: number; reserved: number }[]
}
