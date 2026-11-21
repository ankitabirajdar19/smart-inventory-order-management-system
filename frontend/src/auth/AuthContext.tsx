import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, refreshSession, setAccessToken, unwrap } from '../api/client'
import type { TokenResponse, User } from '../api/types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  setUser: (u: User) => void
  can: (permission: string) => boolean
  isStaff: boolean
}
const Ctx = createContext<AuthState | null>(null)
export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('useAuth outside AuthProvider'); return c }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore the session from the HttpOnly refresh cookie on first load.
  useEffect(() => { refreshSession().then(s => setUser(s?.user ?? null)).finally(() => setLoading(false)) }, [])

  const value = useMemo<AuthState>(() => ({
    user, loading, setUser,
    login: async (email, password) => {
      const t = await unwrap<TokenResponse>(api.post('/auth/login', { email, password }))
      setAccessToken(t.accessToken); setUser(t.user); return t.user
    },
    logout: async () => { try { await api.post('/auth/logout') } finally { setAccessToken(null); setUser(null) } },
    can: p => !!user?.permissions.includes(p),
    isStaff: !!user && !user.roles.every(r => r === 'CUSTOMER'),
  }), [user, loading])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
