import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from './ThemeContext'

function Probe() { const { theme, toggle } = useTheme(); return <button onClick={toggle}>theme:{theme}</button> }

describe('theme switching', () => {
  beforeEach(() => { document.documentElement.classList.remove('dark'); localStorage.clear() })

  it('toggles the dark class on <html> and persists the preference', async () => {
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByRole('button')).toHaveTextContent('theme:light')
    await userEvent.click(screen.getByRole('button'))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    await userEvent.click(screen.getByRole('button'))
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('starts in the theme already applied before first paint', () => {
    document.documentElement.classList.add('dark')
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByRole('button')).toHaveTextContent('theme:dark')
  })
})
