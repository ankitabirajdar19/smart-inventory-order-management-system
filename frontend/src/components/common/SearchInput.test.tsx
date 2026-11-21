import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { SearchInput } from './SearchInput'

function Harness({ spy }: { spy: (v: string) => void }) {
  const [q, setQ] = useState('')
  return (<><SearchInput value={q} onChange={v => { spy(v); setQ(v) }} label="Search things" /><button onClick={() => setQ('')}>Reset filters</button><output>{q}</output></>)
}

describe('SearchInput', () => {
  it('debounces: one call after the user pauses, not one per keystroke', async () => {
    const spy = vi.fn(); render(<Harness spy={spy} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Search things' }), 'abc')
    expect(spy).not.toHaveBeenCalled()
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1)); expect(spy).toHaveBeenCalledWith('abc')
  })

  it('follows the parent when it resets the value, and does not re-apply the old text', async () => {
    const spy = vi.fn(); render(<Harness spy={spy} />)
    const box = screen.getByRole('textbox', { name: 'Search things' })
    await userEvent.type(box, 'abc'); await waitFor(() => expect(spy).toHaveBeenCalledWith('abc'))
    await userEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(box).toHaveValue('')
    await new Promise(r => setTimeout(r, 400)); expect(spy).toHaveBeenCalledTimes(1)
  })

  it('clears immediately and cancels a pending emission', async () => {
    const spy = vi.fn(); render(<Harness spy={spy} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Search things' }), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(spy).toHaveBeenCalledWith(''); await new Promise(r => setTimeout(r, 400))
    expect(spy).not.toHaveBeenCalledWith('x')
  })
})
