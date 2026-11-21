import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardLayout } from './DashboardLayout'
import { authFor, renderApp } from '../../test/utils'

const h = vi.hoisted(() => ({ auth: null as unknown }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => h.auth }))
vi.mock('../../api/services', () => ({ inventoryApi: { lowStock: vi.fn().mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 5 }) } }))

const app = () => renderApp(<Routes><Route element={<DashboardLayout />}><Route index element={<p>page body</p>} /></Route></Routes>)

describe('DashboardLayout responsive navigation and shell', () => {
  beforeEach(() => { localStorage.clear(); h.auth = authFor(['CUSTOMER']) })

  it('opens the mobile drawer from the menu button and closes it with Escape', async () => {
    app()
    expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    expect(screen.getByRole('dialog', { name: 'Navigation menu' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).toBeNull())
  })

  it('closes the drawer with its close button', async () => {
    app()
    await userEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }))
    expect(screen.queryByRole('dialog', { name: 'Navigation menu' })).toBeNull()
  })

  it('collapses and expands the desktop sidebar and remembers the choice', async () => {
    app()
    await userEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
    expect(localStorage.getItem('sidebar')).toBe('collapsed')
  })

  it('renders the page, a skip link, search and the user menu', async () => {
    app()
    expect(screen.getByText('page body')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('search')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Open user menu' }))
    expect(screen.getByRole('button', { name: /my profile/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()
  })
})
