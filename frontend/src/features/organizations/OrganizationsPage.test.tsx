import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { mockApi, renderWithProviders } from '@/test/render'
import type { OrganizationRow } from './api'
import { OrganizationsPage, organizationConsequences } from './OrganizationsPage'

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

const row = (id: number, name: string, extra: Partial<OrganizationRow> = {}): OrganizationRow => ({
  id,
  name,
  industry: 'Retail',
  website: null,
  contact_count: 0,
  open_deal_count: 0,
  open_value: 0,
  ...extra,
})

function names() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent)
}

describe('organizationConsequences', () => {
  it('[R12] counts the contacts and deals that will be left with no organization', () => {
    expect(organizationConsequences({ contacts: 2, deals: 1 })).toEqual([
      '2 contacts will have no organization.',
      '1 deal will have no organization.',
      'They are kept.',
    ])
    expect(organizationConsequences({ contacts: 1, deals: 0 })).toEqual([
      '1 contact will have no organization.',
      'They are kept.',
    ])
    expect(organizationConsequences({ contacts: 0, deals: 0 })).toEqual(['No contacts or deals are linked to it.'])
  })
})

describe('OrganizationsPage', () => {
  beforeEach(() => vi.mocked(toast.success).mockClear())

  it('[R7, R9] lists every organization by name with its counts, open value and a short website', async () => {
    mockApi({
      'GET /organizations': [
        row(1, 'Northwind', {
          website: 'https://www.northwind.example.com',
          contact_count: 3,
          open_deal_count: 2,
          open_value: 45000,
        }),
        row(2, 'Acme', { industry: 'Logistics' }),
      ],
    })
    renderWithProviders(<OrganizationsPage />)
    expect(screen.getByText('Loading…', { selector: 'p' })).toBeInTheDocument()
    await screen.findByText('Northwind')
    expect(screen.getByText('2 companies we do business with')).toBeInTheDocument()
    expect(names()).toEqual(['Acme', 'Northwind'])
    const northwind = screen.getAllByRole('row')[2]
    const cells = within(northwind)
      .getAllByRole('cell')
      .map((c) => c.textContent)
    expect(cells.slice(0, 6)).toEqual(['Northwind', 'Retail', 'northwind.example.com', '3', '2', '$45,000'])
  })

  it('[R7] says so when there are no organizations, or when they could not load', async () => {
    mockApi({ 'GET /organizations': [] })
    const { unmount } = renderWithProviders(<OrganizationsPage />)
    expect(await screen.findByText('No organizations yet. Add the first one.')).toBeInTheDocument()
    expect(screen.getByText('0 companies we do business with')).toBeInTheDocument()
    unmount()

    mockApi({ 'GET /organizations': () => new Response(JSON.stringify({ detail: 'Down' }), { status: 500 }) })
    renderWithProviders(<OrganizationsPage />)
    expect(await screen.findByText("Couldn't load organizations.")).toBeInTheDocument()
  })

  it('[R11] clicking a row opens the organization page', async () => {
    mockApi({ 'GET /organizations': [row(7, 'Acme')] })
    renderWithProviders(<OrganizationsPage />)
    const user = userEvent.setup()
    await user.click(await screen.findByText('Acme'))
    expect(screen.getByTestId('location')).toHaveTextContent('/organizations/7')
  })

  it('[R10] Add opens the form in a side panel, and saving closes it and refreshes the table', async () => {
    let list = [row(1, 'Acme')]
    const { calls } = mockApi({
      'GET /organizations': () => list,
      'POST /organizations': (body: unknown) => {
        list = [...list, row(2, 'Northwind')]
        return { id: 2, ...(body as object), contacts: [], deals: [] }
      },
    })
    renderWithProviders(<OrganizationsPage />)
    const user = userEvent.setup()
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'Add organization' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add organization' })
    await user.type(within(sheet).getByLabelText('Name'), 'Northwind')
    await user.click(within(sheet).getByRole('button', { name: 'Add organization' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(toast.success).toHaveBeenCalledWith('Organization added')
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      name: 'Northwind',
      website: null,
      industry: null,
      notes: null,
    })
    expect(await screen.findByText('Northwind')).toBeInTheDocument()
    expect(names()).toEqual(['Acme', 'Northwind'])
  })

  it('[R9] sorts by open value, then reverses it', async () => {
    mockApi({
      'GET /organizations': [
        row(1, 'Acme', { open_value: 500 }),
        row(2, 'Brightway', { open_value: 90000 }),
        row(3, 'Cobalt', { open_value: 12000 }),
      ],
    })
    renderWithProviders(<OrganizationsPage />)
    const user = userEvent.setup()
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: /Open value/ }))
    expect(names()).toEqual(['Acme', 'Cobalt', 'Brightway'])
    await user.click(screen.getByRole('button', { name: /Open value/ }))
    expect(names()).toEqual(['Brightway', 'Cobalt', 'Acme'])
  })

  it('[R10] Escape closes the add panel', async () => {
    mockApi({ 'GET /organizations': [row(1, 'Acme')] })
    renderWithProviders(<OrganizationsPage />)
    const user = userEvent.setup()
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'Add organization' }))
    await screen.findByRole('dialog', { name: 'Add organization' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('[R10] Cancel closes the add form without saving', async () => {
    const { calls } = mockApi({ 'GET /organizations': [row(1, 'Acme')] })
    renderWithProviders(<OrganizationsPage />)
    const user = userEvent.setup()
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'Add organization' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add organization' })
    await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls.filter((c) => c.method !== 'GET')).toHaveLength(0)
  })

  it('[R11] Edit loads the full record, notes included, and saves the changes', async () => {
    const full = {
      id: 3,
      name: 'Acme',
      industry: 'Retail',
      website: 'acme.example.com',
      notes: 'Prefers email',
      contacts: [],
      deals: [],
    }
    const { calls } = mockApi({
      'GET /organizations': [row(3, 'Acme')],
      'GET /organizations/3': full,
      'PATCH /organizations/3': (body: unknown) => ({ ...full, ...(body as object) }),
    })
    renderWithProviders(<OrganizationsPage />)
    const user = userEvent.setup()
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'Edit Acme' }))
    const sheet = await screen.findByRole('dialog', { name: 'Edit organization' })
    const notes = await within(sheet).findByLabelText(/Notes/)
    expect(notes).toHaveValue('Prefers email')
    expect(within(sheet).getByLabelText(/Website/)).toHaveValue('acme.example.com')
    await user.clear(within(sheet).getByLabelText(/Industry/))
    await user.type(within(sheet).getByLabelText(/Industry/), 'Healthcare')
    await user.click(within(sheet).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(toast.success).toHaveBeenCalledWith('Organization saved')
    expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({
      name: 'Acme',
      website: 'acme.example.com',
      industry: 'Healthcare',
      notes: 'Prefers email',
    })
  })

  it('[R11] the edit panel shows Loading while the record loads, and Cancel closes it', async () => {
    let release: (v: unknown) => void = () => {}
    mockApi({
      'GET /organizations': [row(4, 'Acme')],
      'GET /organizations/4': () => new Promise((resolve) => (release = resolve)),
    })
    renderWithProviders(<OrganizationsPage />)
    const user = userEvent.setup()
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'Edit Acme' }))
    const sheet = await screen.findByRole('dialog', { name: 'Edit organization' })
    expect(within(sheet).getByText('Loading…')).toBeInTheDocument()
    release({ id: 4, name: 'Acme', industry: null, website: null, notes: null, contacts: [], deals: [] })
    await user.click(await within(sheet).findByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('[R12] Delete asks first, naming the organization and its linked records, then removes it', async () => {
    let list = [row(5, 'Acme', { contact_count: 2, open_deal_count: 1 }), row(6, 'Northwind')]
    const { calls } = mockApi({
      'GET /organizations': () => list,
      'GET /organizations/5/delete-preview': { name: 'Acme', contacts: 2, deals: 1 },
      'DELETE /organizations/5': () => {
        list = list.filter((r) => r.id !== 5)
        return undefined
      },
    })
    renderWithProviders(<OrganizationsPage />)
    const user = userEvent.setup()
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'Delete Acme' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(await within(dialog).findByText('Delete Acme?')).toBeInTheDocument()
    expect(within(dialog).getByText('2 contacts will have no organization.')).toBeInTheDocument()
    expect(within(dialog).getByText('1 deal will have no organization.')).toBeInTheDocument()
    expect(within(dialog).getByText('They are kept.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(toast.success).toHaveBeenCalledWith('Organization deleted')
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/organizations/5')).toBe(true)
    await waitFor(() => expect(names()).toEqual(['Northwind']))
  })

  it('[R12] cancelling the delete dialog keeps the organization', async () => {
    const { calls } = mockApi({
      'GET /organizations': [row(8, 'Acme')],
      'GET /organizations/8/delete-preview': { name: 'Acme', contacts: 0, deals: 0 },
    })
    renderWithProviders(<OrganizationsPage />)
    const user = userEvent.setup()
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'Delete Acme' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(await within(dialog).findByText('No contacts or deals are linked to it.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
    expect(names()).toEqual(['Acme'])
  })
})
