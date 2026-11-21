import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { mockApi, renderWithProviders } from '@/test/render'
import type { ContactRow } from './api'
import { contactConsequences, ContactsPage } from './ContactsPage'

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

const row = (id: number, name: string, status: ContactRow['status'], org: string | null): ContactRow => ({
  id,
  name,
  first_name: name.split(' ')[0],
  last_name: name.split(' ')[1],
  email: `${name.split(' ')[0].toLowerCase()}@example.com`,
  phone: null,
  job_title: 'Owner',
  organization_id: org ? 1 : null,
  organization_name: org,
  status,
})
const contacts = [
  row(1, 'Ada Lane', 'lead', 'Acme'),
  row(2, 'Ben Okafor', 'qualified', 'Acme'),
  row(3, 'Cy Reyes', 'customer', 'Northwind'),
  row(4, 'Dee Petrov', 'qualified', 'Northwind'),
]

function names() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent)
}

describe('ContactsPage', () => {
  beforeEach(() => vi.mocked(toast.success).mockClear())

  it('[R13] the status filter works together with the search', async () => {
    mockApi({ 'GET /contacts': contacts })
    renderWithProviders(<ContactsPage />)
    const user = userEvent.setup()
    await screen.findByText('Ada Lane')
    expect(names()).toHaveLength(4)
    const filter = screen.getByRole('radiogroup', { name: 'Status' })
    await user.click(within(filter).getByRole('radio', { name: 'Qualified' }))
    expect(names()).toEqual(['Ben Okafor', 'Dee Petrov'])
    await user.type(screen.getByRole('searchbox', { name: 'Search contacts' }), 'northwind')
    expect(names()).toEqual(['Dee Petrov'])
    await user.click(within(filter).getByRole('radio', { name: 'All' }))
    expect(names()).toEqual(['Cy Reyes', 'Dee Petrov'])
    await user.click(within(filter).getByRole('radio', { name: 'Lead' }))
    expect(screen.getByText('No contacts match "northwind"')).toBeInTheDocument()
  })

  it('[K5] status labels say which "Qualified" they mean', async () => {
    mockApi({ 'GET /contacts': contacts })
    renderWithProviders(<ContactsPage />)
    await screen.findByText('Ada Lane')
    expect(screen.getAllByText('Status: Qualified')).toHaveLength(2)
    expect(screen.getByText('Status: Lead')).toBeInTheDocument()
    expect(screen.getByText('Status: Customer')).toBeInTheDocument()
    expect(screen.queryByText(/^Qualified$/, { selector: 'td *' })).toBeNull()
  })

  it('[R13] counts the people and says when no contact has the chosen status', async () => {
    mockApi({ 'GET /contacts': contacts.filter((c) => c.status !== 'customer') })
    renderWithProviders(<ContactsPage />)
    expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0)
    expect(await screen.findByText('3 people: leads, qualified contacts and customers')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Status' })).getByRole('radio', { name: 'Customer' }),
    )
    expect(screen.getByText('No contacts with this status.')).toBeInTheDocument()
    expect(
      within(screen.getByRole('radiogroup', { name: 'Status' })).getByRole('radio', { name: 'Customer' }),
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('[R10] an empty list invites adding the first contact', async () => {
    mockApi({ 'GET /contacts': [] })
    renderWithProviders(<ContactsPage />)
    expect(await screen.findByText('No contacts yet. Add the first one.')).toBeInTheDocument()
    expect(screen.getByText('0 people: leads, qualified contacts and customers')).toBeInTheDocument()
  })

  it('[R18] links each organization, and says None for a contact without one', async () => {
    mockApi({ 'GET /contacts': [row(1, 'Ada Lane', 'lead', 'Acme'), row(5, 'Eve Stone', 'lead', null)] })
    renderWithProviders(<ContactsPage />)
    await screen.findByText('Ada Lane')
    expect(screen.getByRole('link', { name: 'Acme' })).toHaveAttribute('href', '/organizations/1')
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('[R10] "Add contact" opens a side panel with the filtered status, and saving adds the contact', async () => {
    const { calls } = mockApi({ 'GET /contacts': contacts, 'GET /organizations': [], 'POST /contacts': { id: 9 } })
    renderWithProviders(<ContactsPage />)
    const user = userEvent.setup()
    await screen.findByText('Ada Lane')
    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Status' })).getByRole('radio', { name: 'Customer' }),
    )
    await user.click(screen.getByRole('button', { name: 'Add contact' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add contact' })
    expect(within(within(sheet).getByRole('combobox', { name: 'Status' })).getByText('Customer')).toBeInTheDocument()
    await user.type(within(sheet).getByLabelText('First name'), 'Fay')
    await user.type(within(sheet).getByLabelText('Last name'), 'Moss')
    await user.click(within(sheet).getByRole('button', { name: 'Add contact' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add contact' })).toBeNull())
    expect(calls.find((c) => c.method === 'POST')!.body).toMatchObject({
      first_name: 'Fay',
      last_name: 'Moss',
      status: 'customer',
    })
    expect(toast.success).toHaveBeenCalledWith('Contact added')
  })

  it('[R11] the edit action opens the contact in a side panel and saves it', async () => {
    const { calls } = mockApi({
      'GET /contacts': contacts,
      'GET /organizations': [],
      'PATCH /contacts/2': contacts[1],
    })
    renderWithProviders(<ContactsPage />)
    const user = userEvent.setup()
    await screen.findByText('Ben Okafor')
    await user.click(screen.getByRole('button', { name: 'Edit Ben Okafor' }))
    const sheet = await screen.findByRole('dialog', { name: 'Edit contact' })
    expect(within(sheet).getByLabelText('First name')).toHaveValue('Ben')
    await user.click(within(sheet).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit contact' })).toBeNull())
    expect(calls.find((c) => c.method === 'PATCH')!.path).toBe('/contacts/2')
    expect(toast.success).toHaveBeenCalledWith('Contact saved')
  })

  it('[R11] cancelling the side panel closes it without saving', async () => {
    const { calls } = mockApi({ 'GET /contacts': contacts, 'GET /organizations': [] })
    renderWithProviders(<ContactsPage />)
    const user = userEvent.setup()
    await screen.findByText('Ada Lane')
    await user.click(screen.getByRole('button', { name: 'Add contact' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add contact' })
    await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add contact' })).toBeNull())
    await user.click(screen.getByRole('button', { name: 'Edit Ada Lane' }))
    await screen.findByRole('dialog', { name: 'Edit contact' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit contact' })).toBeNull())
    expect(calls.filter((c) => c.method !== 'GET')).toHaveLength(0)
  })

  it('[R12] the delete action asks first, naming the contact, then deletes it', async () => {
    const { calls } = mockApi({
      'GET /contacts': contacts,
      'GET /contacts/3/delete-preview': { name: 'Cy Reyes', deals: 0, activities: 0 },
      'DELETE /contacts/3': undefined,
    })
    renderWithProviders(<ContactsPage />)
    const user = userEvent.setup()
    await screen.findByText('Cy Reyes')
    await user.click(screen.getByRole('button', { name: 'Delete Cy Reyes' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(await within(dialog).findByText('Delete Cy Reyes?')).toBeInTheDocument()
    expect(within(dialog).getByText('No deals or activities are linked to them.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/contacts/3')).toBe(true)
    expect(toast.success).toHaveBeenCalledWith('Contact deleted')
  })

  it('[R12] cancelling the delete dialog deletes nothing', async () => {
    const { calls } = mockApi({
      'GET /contacts': contacts,
      'GET /contacts/4/delete-preview': { name: 'Dee Petrov', deals: 1, activities: 3 },
    })
    renderWithProviders(<ContactsPage />)
    const user = userEvent.setup()
    await screen.findByText('Dee Petrov')
    await user.click(screen.getByRole('button', { name: 'Delete Dee Petrov' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(await within(dialog).findByText('1 deal will have no main contact.')).toBeInTheDocument()
    expect(within(dialog).getByText('3 activities will be deleted.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(0)
  })
})

describe('contactConsequences', () => {
  it('[R12] says what happens to linked deals and activities, with counts', () => {
    expect(contactConsequences({ deals: 2, activities: 0 })).toEqual(['2 deals will have no main contact.'])
    expect(contactConsequences({ deals: 0, activities: 1 })).toEqual(['1 activity will be deleted.'])
    expect(contactConsequences({ deals: 0, activities: 0 })).toEqual(['No deals or activities are linked to them.'])
  })
})
