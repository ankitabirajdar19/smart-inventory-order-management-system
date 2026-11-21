import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiEnvelope, TokenResponse } from './types'

// The access token lives only in memory (not localStorage) to limit XSS exposure.
// The long-lived refresh token is an HttpOnly cookie managed by the backend.
let accessToken: string | null = null
export const setAccessToken = (t: string | null) => { accessToken = t }

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1'
export const api = axios.create({ baseURL, withCredentials: true })

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  if (accessToken) cfg.headers.Authorization = `Bearer ${accessToken}`
  return cfg
})

let refreshing: Promise<TokenResponse | null> | null = null
export function refreshSession(): Promise<TokenResponse | null> {
  refreshing ??= axios.post<ApiEnvelope<TokenResponse>>(`${baseURL}/auth/refresh`, null, { withCredentials: true })
    .then(r => { setAccessToken(r.data.data.accessToken); return r.data.data })
    .catch(() => { setAccessToken(null); return null })
    .finally(() => { refreshing = null })
  return refreshing
}

api.interceptors.response.use(r => r, async (err: AxiosError) => {
  const cfg = err.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
  if (err.response?.status === 401 && cfg && !cfg._retried && !cfg.url?.includes('/auth/')) {
    cfg._retried = true
    const s = await refreshSession()
    if (s) { cfg.headers.Authorization = `Bearer ${s.accessToken}`; return api(cfg) }
  }
  throw err
})

export const unwrap = <T,>(p: Promise<{ data: ApiEnvelope<T> }>) => p.then(r => r.data.data)

export function errorMessage(e: unknown): string {
  const ax = e as AxiosError<{ message?: string; details?: { field: string; message: string }[] }>
  const d = ax.response?.data
  if (d?.details?.length) return d.details.map(x => `${x.field}: ${x.message}`).join('; ')
  return d?.message ?? (ax.message || 'Something went wrong')
}
