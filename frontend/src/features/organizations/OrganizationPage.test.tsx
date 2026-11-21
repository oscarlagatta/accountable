import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { mockApi, renderWithProviders } from '@/test/render'
import type { Organization } from './api'
import { OrganizationPage } from './OrganizationPage'

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

const deal = (id: number, name: string, stage: string, value: number) => ({
  id,
  name,
  organization_id: 4,
  organization_name: 'Harbor Freight Lines',
  contact_id: 9,
  contact_name: 'Maya Okafor',
  stage,
  value,
  probability: 50,
  expected_revenue: value / 2,
  close_date: '2026-12-31',
  late: false,
  position: 0,
})

function org(id: number, extra: Partial<Organization> = {}): Organization {
  return {
    id,
    name: 'Harbor Freight Lines',
    industry: 'Logistics',
    website: 'harborfreight.example.com',
    notes: 'Met at the expo.\nWants a pilot.',
    contacts: [
      {
        id: 9,
        name: 'Maya Okafor',
        email: 'maya@example.com',
        phone: null,
        job_title: 'Fleet manager',
        status: 'qualified',
      },
      { id: 10, name: 'Leo Grant', email: null, phone: null, job_title: null, status: 'lead' },
    ],
    deals: [
      deal(12, 'Fleet pilot', 'negotiation', 45000),
      deal(13, 'Depot rollout', 'proposal', 5000),
      deal(14, 'Old contract', 'won', 99000),
      deal(15, 'Lost bid', 'lost', 1000),
    ],
    ...extra,
  } as Organization
}

const stages = [
  { key: 'new', label: 'New', probability: 10, open: true },
  { key: 'proposal', label: 'Proposal', probability: 40, open: true },
  { key: 'negotiation', label: 'Negotiation', probability: 70, open: true },
  { key: 'won', label: 'Won', probability: 100, open: false },
  { key: 'lost', label: 'Lost', probability: 0, open: false },
]

function show(id: number, routes: Record<string, unknown> = {}, record: Organization = org(id)) {
  const api = mockApi({
    [`GET /organizations/${id}`]: record,
    'GET /organizations': [],
    'GET /contacts': [],
    'GET /pipeline': { stages, columns: [], totals: {} },
    ...routes,
  })
  renderWithProviders(<OrganizationPage />, { path: `/organizations/${id}`, route: '/organizations/:id' })
  return api
}

describe('OrganizationPage', () => {
  beforeEach(() => vi.mocked(toast.success).mockClear())

  it('[R15] shows its details and notes, with figures counting only open deals', async () => {
    show(4)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Harbor Freight Lines', level: 1 })).toBeInTheDocument()
    const figures = screen
      .getAllByRole('definition')
      .map((f) => f.textContent)
      .join(' | ')
    expect(figures).toContain('$50,000')
    expect(figures).not.toContain('$99,000')
    const website = screen.getByRole('link', { name: 'harborfreight.example.com' })
    expect(website).toHaveAttribute('href', 'https://harborfreight.example.com')
    expect(website).toHaveAttribute('target', '_blank')
    expect(screen.getByText(/Met at the expo\./)).toHaveClass('whitespace-pre-line')
    expect(screen.getAllByText('Logistics').length).toBeGreaterThan(0)
  })

  it('[R15] lists its contacts, linked, with job title and email, and its deals', async () => {
    show(4)
    const contacts = await screen.findByRole('list', { name: 'Contacts' })
    expect(within(contacts).getByRole('link', { name: 'Maya Okafor' })).toHaveAttribute('href', '/contacts/9')
    expect(within(contacts).getByText('Fleet manager · maya@example.com')).toBeInTheDocument()
    expect(within(contacts).getByRole('link', { name: 'Leo Grant' })).toHaveAttribute('href', '/contacts/10')
    const deals = screen.getByRole('list', { name: 'Deals' })
    expect(within(deals).getByRole('link', { name: 'Fleet pilot' })).toHaveAttribute('href', '/deals/12')
    expect(within(deals).getAllByRole('listitem')).toHaveLength(4)
  })

  it('[R15] keeps a website that already has a scheme, and says so when there are no contacts or deals', async () => {
    show(5, {}, org(5, { website: 'http://bare.example.com', contacts: [], deals: [], industry: null, notes: null }))
    expect(await screen.findByText('No contacts at Harbor Freight Lines yet.')).toBeInTheDocument()
    expect(screen.getByText('No deals with Harbor Freight Lines yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'http://bare.example.com' })).toHaveAttribute(
      'href',
      'http://bare.example.com',
    )
    expect(screen.queryByRole('list', { name: 'Contacts' })).toBeNull()
  })

  it('[R15] shows no website link when it has none', async () => {
    show(6, {}, org(6, { website: null }))
    await screen.findByRole('heading', { name: 'Harbor Freight Lines', level: 1 })
    expect(screen.queryByRole('link', { name: /example\.com/ })).toBeNull()
  })

  it('[R15] says the organization was not found when the API returns 404', async () => {
    show(404, {
      'GET /organizations/404': () => new Response(JSON.stringify({ detail: 'Not found' }), { status: 404 }),
    })
    expect(await screen.findByRole('heading', { name: 'Organization not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to organizations' })).toHaveAttribute('href', '/organizations')
  })

  it("[R15] says it couldn't load the organization on other errors", async () => {
    show(7, {
      'GET /organizations/7': () => new Response(JSON.stringify({ detail: 'Down' }), { status: 500 }),
    })
    expect(await screen.findByText("Couldn't load this organization.")).toBeInTheDocument()
  })

  it('[R15] Edit opens the form with the current values and saves the changes', async () => {
    const record = org(8)
    const { calls } = show(8, { 'PATCH /organizations/8': (body: unknown) => ({ ...record, ...(body as object) }) })
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Harbor Freight Lines', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const sheet = await screen.findByRole('dialog', { name: 'Edit organization' })
    expect(within(sheet).getByLabelText('Name')).toHaveValue('Harbor Freight Lines')
    expect(within(sheet).getByLabelText(/Notes/)).toHaveValue('Met at the expo.\nWants a pilot.')
    await user.clear(within(sheet).getByLabelText('Name'))
    await user.type(within(sheet).getByLabelText('Name'), 'Harbor Freight')
    await user.click(within(sheet).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(toast.success).toHaveBeenCalledWith('Organization saved')
    expect(calls.find((c) => c.method === 'PATCH')!.body).toEqual({
      name: 'Harbor Freight',
      website: 'harborfreight.example.com',
      industry: 'Logistics',
      notes: 'Met at the expo.\nWants a pilot.',
    })
  })

  it('[R15] Cancel closes the edit panel without saving', async () => {
    const { calls } = show(9)
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Harbor Freight Lines', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const sheet = await screen.findByRole('dialog', { name: 'Edit organization' })
    await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls.filter((c) => c.method !== 'GET')).toHaveLength(0)
  })

  it('[R15] Add contact pre-fills the organization and saves the contact', async () => {
    const { calls } = show(11, {
      'GET /organizations': [
        {
          id: 11,
          name: 'Harbor Freight Lines',
          industry: null,
          website: null,
          contact_count: 2,
          open_deal_count: 2,
          open_value: 50000,
        },
      ],
      'POST /contacts': { id: 30 },
    })
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Harbor Freight Lines', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Add contact' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add contact' })
    await waitFor(() =>
      expect(
        within(within(sheet).getByRole('combobox', { name: /Organization/ })).getByText('Harbor Freight Lines'),
      ).toBeInTheDocument(),
    )
    await user.type(within(sheet).getByLabelText('First name'), 'Ada')
    await user.type(within(sheet).getByLabelText('Last name'), 'Lane')
    await user.click(within(sheet).getByRole('button', { name: 'Add contact' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(toast.success).toHaveBeenCalledWith('Contact added')
    expect(calls.find((c) => c.method === 'POST')!.body).toMatchObject({
      first_name: 'Ada',
      last_name: 'Lane',
      organization_id: 11,
    })
  })

  it('[R15] Add contact can be cancelled', async () => {
    show(16)
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Harbor Freight Lines', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Add contact' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add contact' })
    await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('[R15] Add deal pre-fills the organization and saves the deal', async () => {
    const { calls } = show(17, {
      'GET /organizations': [
        {
          id: 17,
          name: 'Harbor Freight Lines',
          industry: null,
          website: null,
          contact_count: 0,
          open_deal_count: 0,
          open_value: 0,
        },
      ],
      'POST /deals': { id: 40 },
    })
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Harbor Freight Lines', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Add deal' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add deal' })
    await waitFor(() =>
      expect(
        within(within(sheet).getByRole('combobox', { name: /Organization/ })).getByText('Harbor Freight Lines'),
      ).toBeInTheDocument(),
    )
    await user.type(within(sheet).getByLabelText('Name'), 'Yard expansion')
    await user.type(within(sheet).getByLabelText('Value ($)'), '12000')
    fireEvent.change(within(sheet).getByLabelText('Close date'), { target: { value: '2027-01-31' } })
    await user.click(within(sheet).getByRole('button', { name: 'Add deal' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(toast.success).toHaveBeenCalledWith('Deal added')
    expect(calls.find((c) => c.method === 'POST')!.body).toMatchObject({
      name: 'Yard expansion',
      organization_id: 17,
      value: 12000,
      close_date: '2027-01-31',
    })
  })

  it('[R15] Add deal can be cancelled, and Escape closes the panel too', async () => {
    const { calls } = show(19)
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Harbor Freight Lines', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Add deal' }))
    let sheet = await screen.findByRole('dialog', { name: 'Add deal' })
    await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await user.click(screen.getByRole('button', { name: 'Add deal' }))
    sheet = await screen.findByRole('dialog', { name: 'Add deal' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
  })

  it('[R12, R15] Delete asks first with the linked counts, then deletes and goes back to the table', async () => {
    const { calls } = show(18, {
      'GET /organizations/18/delete-preview': { name: 'Harbor Freight Lines', contacts: 2, deals: 4 },
      'DELETE /organizations/18': undefined,
    })
    const user = userEvent.setup()
    await screen.findByRole('heading', { name: 'Harbor Freight Lines', level: 1 })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(await within(dialog).findByText('Delete Harbor Freight Lines?')).toBeInTheDocument()
    expect(within(dialog).getByText('2 contacts will have no organization.')).toBeInTheDocument()
    expect(within(dialog).getByText('4 deals will have no organization.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/organizations$/))
    expect(toast.success).toHaveBeenCalledWith('Organization deleted')
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/organizations/18')).toBe(true)
  })
})
