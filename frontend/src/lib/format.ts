export const money = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)
export const moneyCompact = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format(n)
export const num = (n: number | null | undefined) => (n == null ? '—' : new Intl.NumberFormat('en-IN').format(n))
export const dateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
export const dateOnly = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
export const label = (s: string) => s.replaceAll('_', ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())
/** Percent change vs a previous value; null when there is no baseline (never invent a trend). */
export const pctChange = (cur: number, prev: number): number | null => (prev === 0 ? null : ((cur - prev) / prev) * 100)
