/** Mirrors the backend's transition rules for display only; the backend remains the source of truth. */
export const FLOW = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']
export const NEXT_STATUS: Record<string, string> = { CONFIRMED: 'PROCESSING', PROCESSING: 'PACKED', PACKED: 'SHIPPED', SHIPPED: 'OUT_FOR_DELIVERY', OUT_FOR_DELIVERY: 'DELIVERED' }
export const CUSTOMER_CANCELLABLE = ['PENDING', 'CONFIRMED']
export const STAFF_CANCELLABLE = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED']
export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']
