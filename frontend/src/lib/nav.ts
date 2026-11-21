import { BarChart3, Boxes, ClipboardList, FolderTree, History, LayoutDashboard, Package, ShoppingBag, ShoppingCart, Warehouse, type LucideIcon } from 'lucide-react'

export interface NavItem { label: string; to: string; icon: LucideIcon; anyOf?: string[]; end?: boolean }
export interface NavGroup { label: string; items: NavItem[] }

/**
 * Only routes that exist AND are backed by a real API appear here.
 * Not yet backed by the backend (so deliberately absent): Customers, Payments list, Suppliers, Purchase Orders,
 * Goods Receipts, Analytics, Forecasting, Reports, Users & Roles, Notifications, Audit Logs, Settings.
 */
export const staffNav: NavGroup[] = [
  { label: 'Overview', items: [{ label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, anyOf: ['REPORT_VIEW'] }] },
  { label: 'Catalogue', items: [
    { label: 'Products', to: '/admin/products', icon: Package, anyOf: ['PRODUCT_WRITE', 'INVENTORY_READ'] },
    { label: 'Categories', to: '/admin/categories', icon: FolderTree, anyOf: ['CATEGORY_WRITE'] }] },
  { label: 'Inventory', items: [
    { label: 'Inventory', to: '/admin/inventory', icon: Boxes, anyOf: ['INVENTORY_READ'] },
    { label: 'Warehouses', to: '/admin/warehouses', icon: Warehouse, anyOf: ['INVENTORY_READ'] },
    { label: 'Stock Movements', to: '/admin/movements', icon: History, anyOf: ['INVENTORY_READ'] }] },
  { label: 'Sales', items: [{ label: 'Orders', to: '/admin/orders', icon: ClipboardList, anyOf: ['ORDER_READ_ALL'] }] },
]

export const customerNav: NavGroup[] = [
  { label: 'Shop', items: [
    { label: 'Shop', to: '/', icon: ShoppingBag, end: true },
    { label: 'Cart', to: '/cart', icon: ShoppingCart },
    { label: 'My Orders', to: '/orders', icon: BarChart3 }] },
]

export const publicNav: NavGroup[] = [{ label: 'Shop', items: [{ label: 'Shop', to: '/', icon: ShoppingBag, end: true }] }]

export function visibleGroups(groups: NavGroup[], can: (p: string) => boolean): NavGroup[] {
  return groups
    .map(g => ({ ...g, items: g.items.filter(i => !i.anyOf || i.anyOf.some(can)) }))
    .filter(g => g.items.length > 0)
}

/** First staff page a user may open (used for the post-login redirect). */
export function firstStaffRoute(can: (p: string) => boolean): string {
  return visibleGroups(staffNav, can)[0]?.items[0]?.to ?? '/profile'
}
