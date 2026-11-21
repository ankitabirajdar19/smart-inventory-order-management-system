import { createContext, forwardRef, useCallback, useContext, useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { AlertCircle, CheckCircle2, Inbox, Loader2, X } from 'lucide-react'
import { label } from '../lib/format'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

/* ---------- Button ---------- */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:opacity-90',
  secondary: 'bg-surface text-fg border border-line hover:bg-subtle',
  ghost: 'text-muted hover:bg-subtle hover:text-fg',
  danger: 'bg-danger text-white hover:opacity-90',
}
export function Button({ variant = 'primary', size = 'md', loading, className = '', children, ...p }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean }) {
  return (
    <button type="button" {...p} disabled={p.disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm', variants[variant], className)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}{children}
    </button>
  )
}

/* ---------- Form controls ---------- */
const field = 'h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg placeholder:text-muted shadow-card aria-[invalid=true]:border-danger disabled:opacity-60'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; trailing?: ReactNode }>(
  ({ label: lbl, error, hint, trailing, id, className = '', ...p }, ref) => {
    const auto = useId(); const fid = id ?? auto
    return (
      <div className="space-y-1.5">
        <label htmlFor={fid} className="block text-xs font-medium text-fg">{lbl}</label>
        <div className="relative">
          <input id={fid} ref={ref} aria-invalid={!!error} aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined} className={cx(field, trailing ? 'pr-10' : '', className)} {...p} />
          {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
        </div>
        {hint && !error && <p id={`${fid}-hint`} className="text-xs text-muted">{hint}</p>}
        {error && <p id={`${fid}-err`} role="alert" className="text-xs text-danger">{error}</p>}
      </div>
    )
  })
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; hideLabel?: boolean }>(
  ({ label: lbl, error, hideLabel, id, className = '', children, ...p }, ref) => {
    const auto = useId(); const fid = id ?? auto
    return (
      <div className="space-y-1.5">
        <label htmlFor={fid} className={hideLabel ? 'sr-only' : 'block text-xs font-medium text-fg'}>{lbl}</label>
        <select id={fid} ref={ref} aria-invalid={!!error} className={cx(field, 'pr-8', className)} {...p}>{children}</select>
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </div>
    )
  })
Select.displayName = 'Select'

export const Checkbox = ({ label: lbl, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) =>
  <label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 rounded border-line accent-[var(--accent)]" {...p} />{lbl}</label>

/* ---------- Surfaces ---------- */
export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) =>
  <div className={cx('rounded-xl border border-line bg-surface shadow-card', className)}>{children}</div>

/* ---------- Status badges ---------- */
const tones = {
  success: 'bg-success-soft text-success', warning: 'bg-warning-soft text-warning', danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info', accent: 'bg-accent-soft text-accent', neutral: 'bg-subtle text-muted',
}
export type Tone = keyof typeof tones
const statusTone: Record<string, Tone> = {
  PENDING: 'warning', INITIATED: 'warning', LOW_STOCK: 'warning', LOW: 'warning',
  CONFIRMED: 'accent', PROCESSING: 'accent', PACKED: 'accent', SHIPPED: 'info', OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success', SUCCESS: 'success', IN_STOCK: 'success', ACTIVE: 'success',
  CANCELLED: 'danger', FAILED: 'danger', OUT_OF_STOCK: 'danger', INACTIVE: 'neutral',
  REFUNDED: 'neutral', PARTIALLY_REFUNDED: 'neutral',
}
export const Badge = ({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) =>
  <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />{children}</span>
export const StatusBadge = ({ status }: { status: string }) => <Badge tone={statusTone[status] ?? 'neutral'}>{label(status)}</Badge>

/* ---------- Feedback states ---------- */
export const Skeleton = ({ className = '' }: { className?: string }) => <div aria-hidden className={cx('animate-pulse rounded-md bg-subtle', className)} />
export const Spinner = () => <div className="flex justify-center p-10" role="status" aria-label="Loading"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
export const EmptyState = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center rounded-xl border border-dashed border-line px-6 py-12 text-center">
    <Inbox className="mb-3 h-8 w-8 text-muted" aria-hidden /><p className="font-medium">{title}</p>
    {hint && <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p>}{action && <div className="mt-4">{action}</div>}
  </div>
)
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><div className="flex-1">{message}</div>
    {onRetry && <button onClick={onRetry} className="font-medium underline">Retry</button>}
  </div>
)

export function Pagination({ page, totalPages, onChange, total }: { page: number; totalPages: number; onChange: (p: number) => void; total?: number }) {
  if (totalPages <= 1 && total === undefined) return null
  return (
    <nav className="flex items-center justify-between gap-3 text-sm text-muted" aria-label="Pagination">
      <span>{total !== undefined ? `${total.toLocaleString()} result${total === 1 ? '' : 's'}` : ''}</span>
      {totalPages > 1 && <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</Button>
        <span aria-live="polite">Page {page + 1} of {totalPages}</span>
        <Button variant="secondary" size="sm" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Next</Button>
      </div>}
    </nav>
  )
}

/* ---------- Toasts ---------- */
type Toast = { id: number; kind: 'ok' | 'err'; text: string }
const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = Date.now() + Math.random()
    setItems(x => [...x, { id, kind, text }])
    setTimeout(() => setItems(x => x.filter(t => t.id !== id)), 5000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {items.map(t => (
          <div key={t.id} role="status" className="flex w-80 max-w-full items-start gap-3 rounded-lg border border-line bg-surface p-3 text-sm shadow-pop">
            {t.kind === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />}
            <span className="flex-1">{t.text}</span>
            <button aria-label="Dismiss notification" onClick={() => setItems(x => x.filter(i => i.id !== t.id))} className="text-muted hover:text-fg"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
