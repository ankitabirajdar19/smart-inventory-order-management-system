import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

export const SEARCH_DEBOUNCE_MS = 300

/**
 * Text is local while typing; the parent is notified after a pause so the API is not hit on every keystroke.
 * If the parent changes the value (e.g. "Clear filters", URL change) the box follows it, and any pending
 * debounced emission of older text is discarded.
 */
export function SearchInput({ value, onChange, placeholder = 'Search', label = 'Search', className = '' }:
  { value: string; onChange: (v: string) => void; placeholder?: string; label?: string; className?: string }) {
  const [local, setLocal] = useState(value)
  const [seen, setSeen] = useState(value)       // last parent value we reacted to
  const [emitted, setEmitted] = useState(value) // last value we sent to the parent
  const latest = useRef(value)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  if (value !== seen) {                          // adjust state while rendering (React-recommended) instead of in an effect
    setSeen(value)
    if (value !== emitted) { setLocal(value); setEmitted(value) }
  }
  useEffect(() => { latest.current = local }, [local])
  useEffect(() => () => clearTimeout(timer.current), [])

  const change = (v: string) => {
    setLocal(v); latest.current = v
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { if (latest.current === v) { setEmitted(v); onChange(v) } }, SEARCH_DEBOUNCE_MS)
  }
  const clear = () => { clearTimeout(timer.current); latest.current = ''; setLocal(''); setEmitted(''); onChange('') }

  return (
    <div className={`relative ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <input aria-label={label} value={local} onChange={e => change(e.target.value)} placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-8 text-sm placeholder:text-muted shadow-card" />
      {local && <button aria-label="Clear search" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-fg"><X className="h-4 w-4" /></button>}
    </div>
  )
}
