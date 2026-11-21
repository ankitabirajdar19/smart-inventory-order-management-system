import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage, RegisterPage } from './AuthPages'
import { ToastProvider } from '../components/ui'

const login = vi.fn()
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ login }) }))
vi.mock('../api/client', () => ({ api: { post: vi.fn() }, errorMessage: () => 'err' }))

const wrap = (ui: React.ReactElement) => render(<MemoryRouter><ToastProvider>{ui}</ToastProvider></MemoryRouter>)

describe('LoginPage', () => {
  it('shows validation errors and does not call the API for empty input', async () => {
    wrap(<LoginPage />)
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('submits valid credentials', async () => {
    login.mockResolvedValue({ roles: ['CUSTOMER'] })
    wrap(<LoginPage />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co')
    await userEvent.type(screen.getByLabelText('Password'), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(login).toHaveBeenCalledWith('a@b.co', 'secret123')
  })
})

describe('RegisterPage', () => {
  it('rejects a weak password', async () => {
    wrap(<RegisterPage />)
    await userEvent.type(screen.getByLabelText('Full name'), 'Ana')
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: /register/i }))
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
  })
})
