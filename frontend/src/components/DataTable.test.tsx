import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link } from 'react-router'
import { renderWithProviders } from '@/test/render'
import { DataTable, stopRowClick, type Column } from './DataTable'

type Row = { id: number; name: string; city: string | null; value: number; org: string }

const data: Row[] = [
  { id: 1, name: 'beta Logistics', city: 'Austin', value: 300, org: 'Acme' },
  { id: 2, name: 'Alpha Clinics', city: null, value: 1000, org: 'Zeta' },
  { id: 3, name: 'Gamma Retail', city: 'Boston', value: 20, org: 'Acme' },
]

const columns: Column<Row>[] = [
  { id: 'name', header: 'Name', value: (r) => r.name },
  { id: 'city', header: 'City', value: (r) => r.city },
  {
    id: 'org',
    header: 'Organization',
    value: (r) => r.org,
    cell: (r) => (
      <Link to={`/organizations/${r.org}`} onClick={stopRowClick}>
        {r.org}
      </Link>
    ),
  },
  { id: 'value', header: 'Value', value: (r) => r.value, numeric: true },
]

function names() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent)
}

function setup(extra: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const utils = renderWithProviders(
    <DataTable
      data={data}
      columns={columns}
      noun="organizations"
      rowHref={(r) => `/organizations/${r.id}`}
      onEdit={onEdit}
      onDelete={onDelete}
      {...extra}
    />,
  )
  return { ...utils, onEdit, onDelete, user: userEvent.setup() }
}

describe('DataTable', () => {
  it('[R7, R9] shows every row, sorted by name A to Z by default', () => {
    setup()
    expect(names()).toEqual(['Alpha Clinics', 'beta Logistics', 'Gamma Retail'])
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'ascending')
  })

  it('[R8] search filters across text columns, case-insensitive', async () => {
    const { user } = setup()
    const box = screen.getByRole('searchbox', { name: 'Search organizations' })
    await user.type(box, 'BOSTON')
    expect(names()).toEqual(['Gamma Retail'])
    await user.clear(box)
    await user.type(box, 'acme')
    expect(names()).toEqual(['beta Logistics', 'Gamma Retail'])
    await user.clear(box)
    await user.type(box, 'logist')
    expect(names()).toEqual(['beta Logistics'])
  })

  it('[R9] clicking a heading sorts, clicking again reverses, with an arrow', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Value' }))
    expect(names()).toEqual(['Gamma Retail', 'beta Logistics', 'Alpha Clinics'])
    expect(screen.getByLabelText('sorted ascending')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Value/ }))
    expect(names()).toEqual(['Alpha Clinics', 'beta Logistics', 'Gamma Retail'])
    expect(screen.getByLabelText('sorted descending')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Value/ })).toHaveAttribute('aria-sort', 'descending')
    // Empty values sort last.
    await user.click(screen.getByRole('button', { name: 'City' }))
    expect(names()).toEqual(['beta Logistics', 'Gamma Retail', 'Alpha Clinics'])
  })

  it('[R8] the empty state names the search and offers to clear it', async () => {
    const { user } = setup()
    await user.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText('No organizations match "zzz"')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(names()).toHaveLength(3)
  })

  it('[R11] clicking a row opens the record; row actions do not', async () => {
    const { user, onEdit, onDelete } = setup()
    await user.click(screen.getByRole('button', { name: 'Edit Alpha Clinics' }))
    expect(onEdit).toHaveBeenCalledWith(data[1])
    await user.click(screen.getByRole('button', { name: 'Delete Gamma Retail' }))
    expect(onDelete).toHaveBeenCalledWith(data[2])
    expect(screen.getByTestId('location')).toHaveTextContent('/')
    await user.click(screen.getByText('Alpha Clinics'))
    expect(screen.getByTestId('location')).toHaveTextContent('/organizations/2')
  })

  it('[R18] linked cells are real links that go to the linked record', async () => {
    const { user } = setup()
    const links = screen.getAllByRole('link', { name: 'Acme' })
    expect(links[0]).toHaveAttribute('href', '/organizations/Acme')
    await user.click(links[0])
    expect(screen.getByTestId('location')).toHaveTextContent('/organizations/Acme')
  })

  it('[R7] says when there are no records at all', () => {
    renderWithProviders(
      <DataTable
        data={[]}
        columns={columns}
        noun="deals"
        rowHref={() => '/'}
        emptyText="No deals yet. Add one to get started."
      />,
    )
    expect(screen.getByText('No deals yet. Add one to get started.')).toBeInTheDocument()
  })
})
