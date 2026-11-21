import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfilePage } from './ProfilePage'
import { authFor, renderApp } from '../test/utils'

const h = vi.hoisted(() => ({ auth: null as unknown }))
const svc = vi.hoisted(() => ({ update: vi.fn(), change: vi.fn() }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => h.auth }))
vi.mock('../api/services', () => ({ profileApi: { update: svc.update, changePassword: svc.change } }))
const app = () => renderApp(<Routes><Route path="/profile" element={<ProfilePage />} /><Route path="/login" element={<p>login page</p>} /></Routes>, '/profile')

describe('ProfilePage', () => {
  beforeEach(() => { vi.clearAllMocks(); h.auth = authFor(['CUSTOMER']); svc.update.mockResolvedValue({ id: 1, fullName: 'New Name', email: 'ada@example.com', roles: ['CUSTOMER'], permissions: [] }); svc.change.mockResolvedValue({}) })

  it('updates the profile through the API and refreshes the auth user', async () => {
    app(); const name = screen.getByLabelText('Full name'); await userEvent.clear(name); await userEvent.type(name, 'New Name')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(svc.update).toHaveBeenCalledWith({ fullName: 'New Name', phone: undefined }))
    await waitFor(() => expect((h.auth as ReturnType<typeof authFor>).setUser).toHaveBeenCalled())
  })

  it('validates the new password rules and confirmation locally', async () => {
    app()
    await userEvent.type(screen.getByLabelText('Current password'), 'old'); await userEvent.type(screen.getByLabelText('New password'), 'Passw0rdOK'); await userEvent.type(screen.getByLabelText('Confirm new password'), 'Different1')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument(); expect(svc.change).not.toHaveBeenCalled()
  })

  it('changes the password, then signs the user out and sends them to login', async () => {
    app()
    await userEvent.type(screen.getByLabelText('Current password'), 'old-pass1'); await userEvent.type(screen.getByLabelText('New password'), 'Passw0rdOK'); await userEvent.type(screen.getByLabelText('Confirm new password'), 'Passw0rdOK')
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
    await waitFor(() => expect(svc.change).toHaveBeenCalledWith({ currentPassword: 'old-pass1', newPassword: 'Passw0rdOK' }))
    expect(await screen.findByText('login page')).toBeInTheDocument(); expect((h.auth as ReturnType<typeof authFor>).logout).toHaveBeenCalled()
  })
})
