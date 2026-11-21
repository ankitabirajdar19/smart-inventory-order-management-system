import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { type Column, DataTable } from './DataTable'
import { renderApp } from '../../test/utils'

interface Row { id: number; name: string; email: string }
const rows: Row[] = [{ id: 1, name: 'Ada', email: 'ada@x.io' }, { id: 2, name: 'Linus', email: 'linus@x.io' }]
const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', sortKey: 'name', cell: r => r.name },
  { key: 'email', header: 'Email', hideable: true, cell: r => r.email },
]

describe('DataTable', () => {
  it('renders rows and reports sorting requests', async () => {
    const onSort = vi.fn()
    renderApp(<DataTable columns={columns} rows={rows} rowKey={r => r.id} onSort={onSort} sort={{ key: 'name', dir: 'asc' }} />)
    expect(screen.getByText('Linus')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(screen.getByRole('button', { name: /name/i }))
    expect(onSort).toHaveBeenCalledWith({ key: 'name', dir: 'desc' })
  })

  it('shows a skeleton (no data rows) while loading', () => {
    renderApp(<DataTable columns={columns} rows={undefined} rowKey={r => r.id} loading />)
    expect(screen.queryByText('Ada')).toBeNull()
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument()
  })

  it('shows an empty state with guidance', () => {
    renderApp(<DataTable columns={columns} rows={[]} rowKey={r => r.id} emptyTitle="No people" emptyHint="Add someone first." />)
    expect(screen.getByText('No people')).toBeInTheDocument(); expect(screen.getByText('Add someone first.')).toBeInTheDocument()
  })

  it('shows an error state with a working retry', async () => {
    const retry = vi.fn()
    renderApp(<DataTable columns={columns} rows={undefined} rowKey={r => r.id} error="Server unreachable" onRetry={retry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Server unreachable')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retry).toHaveBeenCalled()
  })

  it('lets users hide columns', async () => {
    renderApp(<DataTable columns={columns} rows={rows} rowKey={r => r.id} storageKey="test-cols" />)
    expect(screen.getByText('ada@x.io')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Choose columns' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Email' }))
    expect(screen.queryByText('ada@x.io')).toBeNull()
  })

  it('paginates through the callback', async () => {
    const onPage = vi.fn()
    renderApp(<DataTable columns={columns} rows={rows} rowKey={r => r.id} page={0} totalPages={3} totalElements={50} onPage={onPage} />)
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPage).toHaveBeenCalledWith(1)
    expect(screen.getByText('50 results')).toBeInTheDocument()
  })
})
