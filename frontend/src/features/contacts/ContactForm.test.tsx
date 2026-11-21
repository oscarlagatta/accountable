import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockApi, renderWithProviders } from '@/test/render'
import { ContactForm } from './ContactForm'

const orgs = [
  { id: 1, name: 'Acme', industry: 'Retail', website: null, contact_count: 0, open_deal_count: 0, open_value: 0 },
  {
    id: 2,
    name: 'Northwind',
    industry: 'Logistics',
    website: null,
    contact_count: 0,
    open_deal_count: 0,
    open_value: 0,
  },
]

describe('ContactForm', () => {
  it('[R10] requires first and last name and checks the email format', async () => {
    const { calls } = mockApi({ 'GET /organizations': orgs })
    renderWithProviders(<ContactForm onSaved={vi.fn()} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/Email/), 'ada@')
    await user.click(screen.getByRole('button', { name: 'Add contact' }))
    expect(await screen.findAllByText('Required')).toHaveLength(2)
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('[R10] saves with the organization picked and the status', async () => {
    const { calls } = mockApi({ 'GET /organizations': orgs, 'POST /contacts': { id: 5 } })
    const onSaved = vi.fn()
    renderWithProviders(<ContactForm defaults={{ status: 'qualified' }} onSaved={onSaved} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('First name'), 'Ada')
    await user.type(screen.getByLabelText('Last name'), 'Lane')
    await user.click(screen.getByRole('combobox', { name: /Organization/ }))
    await user.click(await screen.findByRole('option', { name: /Northwind/ }))
    await user.click(screen.getByRole('button', { name: 'Add contact' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      first_name: 'Ada',
      last_name: 'Lane',
      email: null,
      phone: null,
      job_title: null,
      organization_id: 2,
      status: 'qualified',
    })
  })

  it('[R10] pre-fills the organization when added from an organization page', async () => {
    mockApi({ 'GET /organizations': orgs })
    renderWithProviders(<ContactForm defaults={{ organization_id: 1 }} onSaved={vi.fn()} onCancel={vi.fn()} />)
    await waitFor(() =>
      expect(within(screen.getByRole('combobox', { name: /Organization/ })).getByText('Acme')).toBeInTheDocument(),
    )
  })

  it('[R11] edits an existing contact, changing its status, and saves with PATCH', async () => {
    const contact = {
      id: 7,
      name: 'Ada Lane',
      first_name: 'Ada',
      last_name: 'Lane',
      email: 'ada@example.com',
      phone: '555-0100',
      job_title: 'Owner',
      organization_id: null,
      organization_name: null,
      status: 'lead' as const,
    }
    const { calls } = mockApi({ 'GET /organizations': orgs, 'PATCH /contacts/7': { ...contact, deals: [] } })
    const onSaved = vi.fn()
    renderWithProviders(<ContactForm contact={contact} onSaved={onSaved} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    expect(screen.getByLabelText('First name')).toHaveValue('Ada')
    await waitFor(() => expect(screen.getByLabelText('First name')).toHaveFocus())
    await user.click(screen.getByRole('combobox', { name: 'Status' }))
    await user.click(await screen.findByRole('option', { name: 'Customer' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 7 })))
    expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({
      path: '/contacts/7',
      body: {
        first_name: 'Ada',
        last_name: 'Lane',
        email: 'ada@example.com',
        phone: '555-0100',
        job_title: 'Owner',
        organization_id: null,
        status: 'customer',
      },
    })
  })

  it("[R10] shows the server's field errors on their fields", async () => {
    mockApi({
      'GET /organizations': orgs,
      'POST /contacts': new Response(
        JSON.stringify({ detail: 'Check the form', errors: { email: 'That email is already in use' } }),
        { status: 422 },
      ),
    })
    const onSaved = vi.fn()
    renderWithProviders(<ContactForm onSaved={onSaved} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('First name'), 'Ada')
    await user.type(screen.getByLabelText('Last name'), 'Lane')
    await user.type(screen.getByLabelText(/Email/), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Add contact' }))
    expect(await screen.findByText('That email is already in use')).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true')
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('[R10] shows a server error that belongs to no field under the form', async () => {
    mockApi({
      'GET /organizations': orgs,
      'POST /contacts': new Response(JSON.stringify({ detail: 'The server is busy' }), { status: 500 }),
    })
    renderWithProviders(<ContactForm onSaved={vi.fn()} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('First name'), 'Ada')
    await user.type(screen.getByLabelText('Last name'), 'Lane')
    await user.click(screen.getByRole('button', { name: 'Add contact' }))
    expect(await screen.findByText('The server is busy')).toBeInTheDocument()
  })

  it('[R10] Cancel calls back without saving', async () => {
    const { calls } = mockApi({ 'GET /organizations': orgs })
    const onCancel = vi.fn()
    renderWithProviders(<ContactForm onSaved={vi.fn()} onCancel={onCancel} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(calls.filter((c) => c.method !== 'GET')).toHaveLength(0)
  })
})
