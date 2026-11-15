import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockApi, renderWithProviders } from '@/test/render'
import { ContactForm } from './ContactForm'

const orgs = [
  { id: 1, name: 'Acme', industry: 'Retail', website: null, contact_count: 0, open_deal_count: 0, open_value: 0 },
  { id: 2, name: 'Northwind', industry: 'Logistics', website: null, contact_count: 0, open_deal_count: 0, open_value: 0 },
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
      first_name: 'Ada', last_name: 'Lane', email: null, phone: null, job_title: null, organization_id: 2, status: 'qualified',
    })
  })

  it('[R10] pre-fills the organization when added from an organization page', async () => {
    mockApi({ 'GET /organizations': orgs })
    renderWithProviders(<ContactForm defaults={{ organization_id: 1 }} onSaved={vi.fn()} onCancel={vi.fn()} />)
    await waitFor(() => expect(within(screen.getByRole('combobox', { name: /Organization/ })).getByText('Acme')).toBeInTheDocument())
  })
})
