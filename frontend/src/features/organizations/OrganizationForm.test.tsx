import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockApi, renderWithProviders } from '@/test/render'
import { OrganizationForm } from './OrganizationForm'

describe('OrganizationForm', () => {
  it('[R10] requires a name and checks the website format, with messages under the fields', async () => {
    const { calls } = mockApi({})
    renderWithProviders(<OrganizationForm onSaved={vi.fn()} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText(/Website/), 'not a website')
    await user.click(screen.getByRole('button', { name: 'Add organization' }))
    expect(await screen.findByText('Required')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid website, such as example.com')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
    expect(calls).toHaveLength(0)
  })

  it('[R10] saves trimmed values, with blanks as empty', async () => {
    const saved = { id: 9, name: 'Northwind', website: 'northwind.example.com', industry: null, notes: null, contacts: [], deals: [] }
    const { calls } = mockApi({ 'POST /organizations': saved })
    const onSaved = vi.fn()
    renderWithProviders(<OrganizationForm onSaved={onSaved} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Name'), '  Northwind ')
    await user.type(screen.getByLabelText(/Website/), 'northwind.example.com')
    await user.click(screen.getByRole('button', { name: 'Add organization' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved))
    expect(calls[0].body).toEqual({ name: 'Northwind', website: 'northwind.example.com', industry: null, notes: null })
  })

  it('[R10] shows the server\'s field messages', async () => {
    mockApi({
      'POST /organizations': () => new Response(JSON.stringify({ detail: 'Some fields need attention', errors: { name: 'Already taken' } }), { status: 422 }),
    })
    renderWithProviders(<OrganizationForm onSaved={vi.fn()} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Name'), 'Acme')
    await user.click(screen.getByRole('button', { name: 'Add organization' }))
    expect(await screen.findByText('Already taken')).toBeInTheDocument()
  })
})
