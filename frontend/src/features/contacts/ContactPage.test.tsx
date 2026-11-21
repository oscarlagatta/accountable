import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { mockApi, renderWithProviders } from '@/test/render'
import type { Contact } from './api'
import { ContactPage } from './ContactPage'

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

const deal = {
  id: 12,
  name: 'Fleet pilot',
  organization_id: 4,
  organization_name: 'Harbor Freight Lines',
  contact_id: 9,
  contact_name: 'Maya Okafor',
  stage: 'negotiation' as const,
  value: 45000,
  probability: 70,
  expected_revenue: 31500,
  close_date: '2026-12-31',
  late: false,
  position: 0,
}

const contact = (id: number, overrides: Partial<Contact> = {}): Contact => ({
  id,
  name: 'Maya Okafor',
  first_name: 'Maya',
  last_name: 'Okafor',
  email: 'maya@harbor.example',
  phone: '555-0101',
  job_title: 'Ops lead',
  organization_id: 4,
  organization_name: 'Harbor Freight Lines',
  status: 'qualified',
  deals: [deal],
  ...overrides,
})

const orgs = [
  {
    id: 4,
    name: 'Harbor Freight Lines',
    industry: 'Logistics',
    website: null,
    contact_count: 1,
    open_deal_count: 1,
    open_value: 45000,
  },
]

/** The routes a contact page asks for, with the contact's own record as given. */
function routes(c: Contact, extra: Record<string, unknown> = {}) {
  return {
    [`GET /contacts/${c.id}`]: c,
    [`GET /contacts/${c.id}/timeline`]: [],
    'GET /contacts': [c],
    'GET /deals': [deal],
    'GET /organizations': orgs,
    'GET /pipeline': { stages: [{ key: 'negotiation', label: 'Negotiation', probability: 70, open: true }] },
    ...extra,
  }
}

function renderPage(id: number) {
  return renderWithProviders(<ContactPage />, { path: `/contacts/${id}`, route: '/contacts/:id' })
}

describe('ContactPage', () => {
  beforeEach(() => vi.mocked(toast.success).mockClear())

  it('[R16, R18] shows details, status and the linked organization, its deals and a timeline', async () => {
    mockApi(routes(contact(9)))
    renderPage(9)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Maya Okafor', level: 1 })).toBeInTheDocument()
    expect(screen.getAllByText('Status: Qualified')).toHaveLength(2)
    expect(screen.getAllByText(/Ops lead/)).toHaveLength(2)
    for (const link of screen.getAllByRole('link', { name: 'Harbor Freight Lines' }))
      expect(link).toHaveAttribute('href', '/organizations/4')
    expect(screen.getByRole('link', { name: 'maya@harbor.example' })).toHaveAttribute(
      'href',
      'mailto:maya@harbor.example',
    )
    expect(screen.getByText('555-0101')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Fleet pilot/ })).toHaveAttribute('href', '/deals/12')
    expect(screen.getByRole('form', { name: 'Log activity' })).toBeInTheDocument()
    expect(await screen.findByText('No activities yet. Log a call, email or note above.')).toBeInTheDocument()
  })

  it('[R16] a contact with no organization, job title, email or phone says so', async () => {
    mockApi(
      routes(
        contact(10, {
          organization_id: null,
          organization_name: null,
          job_title: null,
          email: null,
          phone: null,
          status: 'lead',
          deals: [],
        }),
      ),
    )
    renderPage(10)
    expect(await screen.findByRole('heading', { name: 'Maya Okafor', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText('None')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Harbor Freight Lines' })).toBeNull()
    expect(screen.queryByRole('link', { name: /@/ })).toBeNull()
    expect(screen.getByText("Maya isn't the main contact on any deals.")).toBeInTheDocument()
  })

  it('[R16] says the contact was not found when the server has no such contact', async () => {
    mockApi({})
    renderPage(404)
    expect(await screen.findByRole('heading', { name: 'Contact not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to contacts' })).toHaveAttribute('href', '/contacts')
  })

  it('[R16] says so when the contact could not be loaded', async () => {
    mockApi({ 'GET /contacts/11': new Response(JSON.stringify({ detail: 'Boom' }), { status: 500 }) })
    renderPage(11)
    expect(await screen.findByText("Couldn't load this contact.")).toBeInTheDocument()
  })

  it('[R16] edits the contact in a side panel and closes it on save', async () => {
    const { calls } = mockApi(routes(contact(12), { 'PATCH /contacts/12': contact(12, { job_title: 'COO' }) }))
    renderPage(12)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const sheet = await screen.findByRole('dialog', { name: 'Edit contact' })
    const title = within(sheet).getByLabelText(/Job title/)
    expect(title).toHaveValue('Ops lead')
    await user.clear(title)
    await user.type(title, 'COO')
    await user.click(within(sheet).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit contact' })).toBeNull())
    expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({
      path: '/contacts/12',
      body: { job_title: 'COO', organization_id: 4, status: 'qualified' },
    })
    expect(toast.success).toHaveBeenCalledWith('Contact saved')
  })

  it('[R16] cancelling the edit closes the panel without saving', async () => {
    const { calls } = mockApi(routes(contact(13)))
    renderPage(13)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const sheet = await screen.findByRole('dialog', { name: 'Edit contact' })
    await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit contact' })).toBeNull())
    expect(calls.filter((c) => c.method !== 'GET')).toHaveLength(0)
  })

  it('[R16] "Add deal" opens a deal form with this contact filled in, and Escape closes it', async () => {
    mockApi(routes(contact(14)))
    renderPage(14)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Add deal' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add deal' })
    await waitFor(() =>
      expect(
        within(within(sheet).getByRole('combobox', { name: /Main contact/ })).getByText('Maya Okafor'),
      ).toBeInTheDocument(),
    )
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add deal' })).toBeNull())
  })

  it('[R16] cancelling the deal form closes the panel', async () => {
    mockApi(routes(contact(15)))
    renderPage(15)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Add deal' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add deal' })
    await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add deal' })).toBeNull())
  })

  it('[R12, R16] delete asks first with counts, then deletes and goes back to the contacts list', async () => {
    const { calls } = mockApi(
      routes(contact(16), {
        'GET /contacts/16/delete-preview': { name: 'Maya Okafor', deals: 2, activities: 1 },
        'DELETE /contacts/16': undefined,
      }),
    )
    renderPage(16)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(await within(dialog).findByText('Delete Maya Okafor?')).toBeInTheDocument()
    expect(within(dialog).getByText('2 deals will have no main contact.')).toBeInTheDocument()
    expect(within(dialog).getByText('1 activity will be deleted.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/contacts$/))
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/contacts/16')).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Contact deleted')
  })
})
