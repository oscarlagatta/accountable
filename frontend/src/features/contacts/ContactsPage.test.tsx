import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockApi, renderWithProviders } from '@/test/render'
import type { ContactRow } from './api'
import { ContactsPage } from './ContactsPage'

const row = (id: number, name: string, status: ContactRow['status'], org: string | null): ContactRow => ({
  id, name, first_name: name.split(' ')[0], last_name: name.split(' ')[1], email: `${name.split(' ')[0].toLowerCase()}@example.com`,
  phone: null, job_title: 'Owner', organization_id: org ? 1 : null, organization_name: org, status,
})
const contacts = [
  row(1, 'Ada Lane', 'lead', 'Acme'),
  row(2, 'Ben Okafor', 'qualified', 'Acme'),
  row(3, 'Cy Reyes', 'customer', 'Northwind'),
  row(4, 'Dee Petrov', 'qualified', 'Northwind'),
]

function names() {
  return screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent)
}

describe('ContactsPage', () => {
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
})
