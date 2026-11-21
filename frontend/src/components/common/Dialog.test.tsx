import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog, Dialog } from './Dialog'

function Harness() {
  const [open, setOpen] = useState(false)
  return (<><button onClick={() => setOpen(true)}>Open</button>
    <Dialog open={open} onClose={() => setOpen(false)} title="Edit thing" description="Make a change"><label>Name<input /></label><button>Save</button></Dialog></>)
}

describe('Dialog accessibility', () => {
  it('is labelled, moves focus to the FIRST FIELD (not the frame), and restores focus on close', async () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open' })
    await userEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Edit thing' })
    expect(dialog).toHaveAttribute('aria-modal', 'true'); expect(dialog).toHaveAccessibleDescription('Make a change')
    expect(screen.getByLabelText('Name')).toHaveFocus()        // regression: `focus() ?? focus()` used to steal focus to the frame
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull(); expect(opener).toHaveFocus()
  })

  it('traps Tab inside the dialog', async () => {
    render(<Harness />); await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.tab()                                      // Name -> Save
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()
    await userEvent.tab()                                      // wraps to the first focusable (Close)
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
  })

  it('ConfirmDialog calls back only on the confirm button', async () => {
    const onConfirm = vi.fn(), onClose = vi.fn()
    render(<ConfirmDialog open onClose={onClose} onConfirm={onConfirm} title="Delete?" description="Cannot be undone" confirmLabel="Delete" danger />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(onConfirm).not.toHaveBeenCalled(); expect(onClose).toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' })); expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
