import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '../ui'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Accessible modal: role=dialog, labelled, Esc to close, focus moved in and restored, Tab trapped. */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }:
  { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const ref = useRef<HTMLDivElement>(null); const titleId = useId(); const descId = useId()
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const firstField = ref.current?.querySelector<HTMLElement>('input,select,textarea')
    ;(firstField ?? ref.current)?.focus()   // focus() returns undefined, so `a?.focus() ?? b?.focus()` would always focus b
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
      if (e.key !== 'Tab' || !ref.current) return
      const els = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!els.length) return
      const first = els[0], last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; previous?.focus() }
  }, [open, onClose])
  if (!open) return null
  const width = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size]
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descId : undefined} tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-surface shadow-pop sm:rounded-xl ${width}`}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div><h2 id={titleId} className="text-base font-semibold">{title}</h2>{description && <p id={descId} className="mt-0.5 text-sm text-muted">{description}</p>}</div>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-muted hover:bg-subtle hover:text-fg"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>, document.body)
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', danger, loading }:
  { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; confirmLabel?: string; danger?: boolean; loading?: boolean }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <span className="sr-only">Please confirm this action.</span>
    </Dialog>
  )
}
