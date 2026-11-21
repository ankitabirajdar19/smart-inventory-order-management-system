import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Banknote, Boxes, ClipboardList, PackageX, Receipt, RefreshCw, ShoppingBag, TriangleAlert, Wallet } from 'lucide-react'
import { dashboardApi } from '../api/services'
import { errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ChartCard } from '../components/dashboard/ChartCard'
import { OrdersChart, RevenueChart, StatusDonut, StockHealthDonut, TopProductsChart, WarehouseStockChart } from '../components/dashboard/Charts'
import { LowStockPanel, RecentMovementsPanel, RecentOrdersPanel } from '../components/dashboard/Panels'
import { StatCard } from '../components/dashboard/StatCard'
import { PageHeader } from '../components/common/PageHeader'
import { Button, ErrorState, Select } from '../components/ui'
import { money, num, pctChange } from '../lib/format'

const RANGES = [7, 30, 90]
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export function DashboardPage() {
  const { can } = useAuth()
  const [days, setDays] = useState(30)
  const [now, setNow] = useState(() => Date.now())   // snapshot; refreshed by the Refresh button
  const range = useMemo(() => ({ from: isoDay(now - (days - 1) * 86_400_000), to: isoDay(now) }), [days, now])
  const q = useQuery({ queryKey: ['dashboard', 'summary', range], queryFn: () => dashboardApi.summary(range) })
  const s = q.data; const loading = q.isLoading; const err = q.isError ? errorMessage(q.error) : null
  const prevLabel = `vs previous ${days} days`

  return (
    <div>
      <PageHeader title="Business Overview" description="Monitor inventory, orders, and business activity from one place."
        actions={<>
          <Select label="Date range" hideLabel value={days} onChange={e => setDays(Number(e.target.value))} className="w-40">{RANGES.map(d => <option key={d} value={d}>Last {d} days</option>)}</Select>
          <Button variant="secondary" onClick={() => { setNow(Date.now()); q.refetch() }} disabled={q.isFetching} aria-label="Refresh dashboard"><RefreshCw className={`h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} aria-hidden />Refresh</Button>
        </>} />

      {err && <div className="mb-4"><ErrorState message={err} onRetry={() => q.refetch()} /></div>}

      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Total products" loading={loading} unavailable={!!err} value={s && num(s.inventory.totalProducts)} to={can('PRODUCT_WRITE') || can('INVENTORY_READ') ? '/admin/products' : undefined} />
        <StatCard icon={Boxes} label="Inventory units" loading={loading} unavailable={!!err} value={s && num(s.inventory.availableUnits + s.inventory.reservedUnits)} hint={s && `${num(s.inventory.reservedUnits)} reserved`} to={can('INVENTORY_READ') ? '/admin/inventory' : undefined} />
        <StatCard icon={Wallet} label="Inventory value" loading={loading} unavailable={!!err} value={s && money(s.inventory.inventoryValue)} hint="at selling price" />
        <StatCard icon={Banknote} label="Revenue" loading={loading} unavailable={!!err} value={s && money(s.sales.revenue)} trend={s && { pct: pctChange(s.sales.revenue, s.sales.previousRevenue), label: prevLabel }} hint={s && `AOV ${money(s.sales.averageOrderValue)}`} />
        <StatCard icon={Receipt} label={`Orders (${days}d)`} loading={loading} unavailable={!!err} value={s && num(s.sales.ordersInPeriod)} trend={s && { pct: pctChange(s.sales.ordersInPeriod, s.sales.previousOrders), label: prevLabel }} />
        <StatCard icon={ClipboardList} label="Pending orders" loading={loading} unavailable={!!err} value={s && num(s.sales.pendingOrders)} hint="awaiting payment" to={can('ORDER_READ_ALL') ? '/admin/orders' : undefined} />
        <StatCard icon={TriangleAlert} label="Low-stock items" loading={loading} unavailable={!!err} value={s && num(s.inventory.lowStockRecords)} hint="product × warehouse" to={can('INVENTORY_READ') ? '/admin/inventory' : undefined} />
        <StatCard icon={PackageX} label="Out-of-stock items" loading={loading} unavailable={!!err} value={s && num(s.inventory.outOfStockRecords)} hint="product × warehouse" to={can('INVENTORY_READ') ? '/admin/inventory' : undefined} />
      </section>

      <section aria-label="Sales charts" className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue trend" description="Confirmed orders only, per day (UTC)" loading={loading} error={err} onRetry={() => q.refetch()} empty={!!s && s.daily.every(d => d.revenue === 0)} emptyText="No revenue in this period">{s && <RevenueChart daily={s.daily} />}</ChartCard>
        <ChartCard title="Order activity" description="All orders created per day" loading={loading} error={err} onRetry={() => q.refetch()} empty={!!s && s.daily.every(d => d.orders === 0)} emptyText="No orders in this period">{s && <OrdersChart daily={s.daily} />}</ChartCard>
        <ChartCard title="Order status breakdown" description="Orders created in this period" loading={loading} error={err} onRetry={() => q.refetch()} empty={!!s && s.ordersByStatus.length === 0} emptyText="No orders in this period">{s && <StatusDonut data={s.ordersByStatus} />}</ChartCard>
        <ChartCard title="Top-selling products" description="By units, confirmed orders" loading={loading} error={err} onRetry={() => q.refetch()} empty={!!s && s.topProducts.length === 0} emptyText="No sales in this period">{s && <TopProductsChart data={s.topProducts} />}</ChartCard>
      </section>

      <section aria-label="Inventory charts" className="mt-4 grid gap-4 lg:grid-cols-2">
        <ChartCard title="Inventory distribution" description="Units per warehouse" loading={loading} error={err} onRetry={() => q.refetch()} empty={!!s && s.stockByWarehouse.every(w => w.available + w.reserved === 0)} emptyText="No stock recorded">{s && <WarehouseStockChart data={s.stockByWarehouse} />}</ChartCard>
        <ChartCard title="Stock availability" description="Inventory records by status" loading={loading} error={err} onRetry={() => q.refetch()} empty={!!s && s.inventory.stockRecords === 0} emptyText="No inventory records">
          {s && <StockHealthDonut inStock={s.inventory.stockRecords - s.inventory.lowStockRecords - s.inventory.outOfStockRecords} low={s.inventory.lowStockRecords} out={s.inventory.outOfStockRecords} />}</ChartCard>
      </section>

      <section aria-label="Activity" className="mt-6 grid gap-4 xl:grid-cols-2">
        {can('ORDER_READ_ALL') && <RecentOrdersPanel />}
        {can('INVENTORY_READ') && <LowStockPanel />}
        {can('INVENTORY_READ') && <div className="xl:col-span-2"><RecentMovementsPanel /></div>}
      </section>
      {s && <p className="mt-4 text-xs text-muted">Revenue counts orders that reached Confirmed or later. Data generated {new Date(s.generatedAt).toLocaleTimeString()}.</p>}
    </div>
  )
}
