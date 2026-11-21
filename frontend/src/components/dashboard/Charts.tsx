import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardSummary } from '../../api/types'
import { label, money, moneyCompact, num } from '../../lib/format'

const tick = { fill: 'var(--muted)', fontSize: 12 }
const tip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 12, color: 'var(--fg)' }, labelStyle: { color: 'var(--muted)' }, cursor: { fill: 'var(--subtle)' } }
const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'var(--warning)', CONFIRMED: 'var(--accent)', PROCESSING: '#8B5CF6', PACKED: '#A78BFA', SHIPPED: 'var(--info)',
  OUT_FOR_DELIVERY: '#06B6D4', DELIVERED: 'var(--success)', CANCELLED: 'var(--danger)', RETURN_REQUESTED: '#F59E0B', RETURNED: 'var(--muted)',
}

export function RevenueChart({ daily }: { daily: DashboardSummary['daily'] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickFormatter={dayLabel} tick={tick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tickFormatter={v => moneyCompact(Number(v))} tick={tick} tickLine={false} axisLine={false} width={64} />
        <Tooltip {...tip} labelFormatter={l => dayLabel(String(l))} formatter={v => [money(Number(v)), 'Revenue']} />
        <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>)
}

export function OrdersChart({ daily }: { daily: DashboardSummary['daily'] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickFormatter={dayLabel} tick={tick} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis allowDecimals={false} tick={tick} tickLine={false} axisLine={false} width={32} />
        <Tooltip {...tip} labelFormatter={l => dayLabel(String(l))} formatter={v => [num(Number(v)), 'Orders']} />
        <Bar dataKey="orders" fill="var(--accent)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>)
}

export function WarehouseStockChart({ data }: { data: DashboardSummary['stockByWarehouse'] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={false} />
        <YAxis tick={tick} tickLine={false} axisLine={false} width={40} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="available" name="Available" stackId="s" fill="var(--accent)" />
        <Bar dataKey="reserved" name="Reserved" stackId="s" fill="var(--warning)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>)
}

function Donut({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={2} stroke="var(--surface)">
          {data.map(d => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip {...tip} formatter={(v, n) => [num(Number(v)), String(n)]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>)
}
export const StatusDonut = ({ data }: { data: DashboardSummary['ordersByStatus'] }) =>
  <Donut data={data.map(s => ({ name: label(s.status), value: s.count, color: STATUS_COLOR[s.status] ?? 'var(--muted)' }))} />
export const StockHealthDonut = ({ inStock, low, out }: { inStock: number; low: number; out: number }) =>
  <Donut data={[{ name: 'In stock', value: inStock, color: 'var(--success)' }, { name: 'Low stock', value: low, color: 'var(--warning)' }, { name: 'Out of stock', value: out, color: 'var(--danger)' }].filter(d => d.value > 0)} />

export function TopProductsChart({ data }: { data: DashboardSummary['topProducts'] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={tick} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={tick} tickLine={false} axisLine={false} width={120} tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)} />
        <Tooltip {...tip} formatter={(v, _n, p) => [`${num(Number(v))} units · ${money((p.payload as { revenue: number }).revenue)}`, 'Sold']} />
        <Bar dataKey="units" fill="var(--accent)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>)
}
