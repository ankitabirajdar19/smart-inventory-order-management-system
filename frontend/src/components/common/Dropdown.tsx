import { useEffect, useRef, useState, type ReactNode } from 'react'

/** Minimal accessible popover: button toggles, Esc and outside click close. Children receive a close callback. */
export function Dropdown({ label, trigger, children, align = 'right', width = 'w-60', triggerClassName = '' }:
  { label: string; trigger: ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; width?: string; triggerClassName?: string }) {
  const [open, setOpen] = useState(false); const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [open])
  return (
    <div className="relative" ref={root}>
      <button aria-label={label} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(o => !o)} className={triggerClassName}>{trigger}</button>
      {open && <div className={`absolute z-40 mt-2 ${width} ${align === 'right' ? 'right-0' : 'left-0'} max-w-[calc(100vw-1.5rem)] rounded-xl border border-line bg-surface p-1.5 shadow-pop`}>{children(() => setOpen(false))}</div>}
    </div>
  )
}
export const MenuItem = ({ children, onClick, danger, icon }: { children: ReactNode; onClick?: () => void; danger?: boolean; icon?: ReactNode }) => (
  <button onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-subtle ${danger ? 'text-danger' : ''}`}>{icon}{children}</button>
)
