import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'
interface ThemeState { theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }
const Ctx = createContext<ThemeState | null>(null)

export const useTheme = () => { const c = useContext(Ctx); if (!c) throw new Error('useTheme outside ThemeProvider'); return c }

export function ThemeProvider({ children }: { children: ReactNode }) {
  // index.html already applied the class before paint; read it back so state and DOM agree.
  const [theme, setThemeState] = useState<Theme>(() => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'))
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try { localStorage.setItem('theme', theme) } catch { /* storage unavailable: keep in-memory preference */ }
  }, [theme])
  const setTheme = useCallback((t: Theme) => setThemeState(t), [])
  const toggle = useCallback(() => setThemeState(t => (t === 'dark' ? 'light' : 'dark')), [])
  const value = useMemo(() => ({ theme, toggle, setTheme }), [theme, toggle, setTheme])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
