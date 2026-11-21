import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from './components/ui'
import { Layout, RequireAuth } from './components/Layout'
import { useAuth } from './auth/AuthContext'
import { firstStaffRoute } from './lib/nav'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { ProductsPage } from './pages/ProductsPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrderDetailPage, OrdersPage } from './pages/OrdersPage'
import { ProfilePage } from './pages/ProfilePage'
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage').then(m => ({ default: m.AdminProductsPage })))
const AdminInventoryPage = lazy(() => import('./pages/admin/AdminInventoryPage').then(m => ({ default: m.AdminInventoryPage })))
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage').then(m => ({ default: m.AdminOrdersPage })))
const CategoriesPage = lazy(() => import('./pages/admin/CategoriesPage').then(m => ({ default: m.CategoriesPage })))
const WarehousesPage = lazy(() => import('./pages/admin/WarehousesPage').then(m => ({ default: m.WarehousesPage })))
const MovementsPage = lazy(() => import('./pages/admin/MovementsPage').then(m => ({ default: m.MovementsPage })))

/** Staff land on their first permitted admin page; customers and visitors see the shop. */
function Home() {
  const { user, loading, can, isStaff } = useAuth()
  if (!loading && user && isStaff) return <Navigate to={firstStaffRoute(can)} replace />
  return <ProductsPage />
}

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route element={<RequireAuth role="CUSTOMER" />}>
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
        </Route>
        <Route element={<RequireAuth />}><Route path="profile" element={<ProfilePage />} /></Route>
        <Route element={<RequireAuth permission="REPORT_VIEW" />}><Route path="admin/dashboard" element={<DashboardPage />} /></Route>
        <Route element={<RequireAuth anyOf={['PRODUCT_WRITE', 'INVENTORY_READ']} />}><Route path="admin/products" element={<AdminProductsPage />} /></Route>
        <Route element={<RequireAuth permission="CATEGORY_WRITE" />}><Route path="admin/categories" element={<CategoriesPage />} /></Route>
        <Route element={<RequireAuth permission="INVENTORY_READ" />}>
          <Route path="admin/inventory" element={<AdminInventoryPage />} />
          <Route path="admin/warehouses" element={<WarehousesPage />} />
          <Route path="admin/movements" element={<MovementsPage />} />
        </Route>
        <Route element={<RequireAuth permission="ORDER_READ_ALL" />}>
          <Route path="admin/orders" element={<AdminOrdersPage />} />
          <Route path="admin/orders/:id" element={<OrderDetailPage admin />} />
        </Route>
        <Route path="*" element={<p className="p-10 text-center text-muted">Page not found</p>} />
      </Route>
    </Routes>
    </Suspense>
  )
}
