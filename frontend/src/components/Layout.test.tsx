import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RequireAuth } from './Layout'

let state: { user: unknown; loading: boolean; can: (p: string) => boolean } = { user: null, loading: false, can: () => false }
vi.mock('../auth/AuthContext', () => ({ useAuth: () => state }))

const app = (path: string) => render(
  <MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/login" element={<p>login page</p>} /><Route path="/" element={<p>home</p>} />
    <Route element={<RequireAuth permission="PRODUCT_WRITE" />}><Route path="/admin" element={<p>admin area</p>} /></Route>
  </Routes></MemoryRouter>)

describe('RequireAuth (UI-level role navigation)', () => {
  it('redirects anonymous users to login', () => { state = { user: null, loading: false, can: () => false }; app('/admin'); expect(screen.getByText('login page')).toBeInTheDocument() })
  it('redirects users lacking the permission', () => { state = { user: { roles: ['CUSTOMER'] }, loading: false, can: () => false }; app('/admin'); expect(screen.getByText('home')).toBeInTheDocument() })
  it('lets permitted staff in', () => { state = { user: { roles: ['ADMIN'] }, loading: false, can: p => p === 'PRODUCT_WRITE' }; app('/admin'); expect(screen.getByText('admin area')).toBeInTheDocument() })
  it('shows a loading state while the session restores', () => { state = { user: null, loading: true, can: () => false }; app('/admin'); expect(screen.getByRole('status')).toBeInTheDocument() })
})
