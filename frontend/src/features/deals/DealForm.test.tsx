import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ContactRow } from '@/features/contacts/api'
import { mockApi, renderWithProviders } from '@/test/render'
import { DealForm, contactOptions } from './DealForm'

// Probabilities that differ from the defaults, to prove they come from the API's stage list.
const stages = [
  { key: 'new', label: 'New', probability: 6, open: true },
  { key: 'qualified', label: 'Qualified', probability: 21, open: true },
  { key: 'proposal', label: 'Proposal', probability: 41, open: true },
  { key: 'negotiation', label: 'Negotiation', probability: 71, open: true },
  { key: 'won', label: 'Won', probability: 100, open: false },
  { key: 'lost', label: 'Lost', probability: 0, open: false },
]
const person = (
  id: number,
  name: string,
  organization_id: number | null,
  organization_name: string | null,
): ContactRow => ({
  id,
  name,
  first_name: name.split(' ')[0],
  last_name: name.split(' ')[1],
  email: null,
  phone: null,
  job_title: null,
  organization_id,
  organization_name,
  status: 'lead',
})
const contacts = [
  person(1, 'Ada Lane', 2, 'Northwind'),
  person(2, 'Ben Okafor', 1, 'Acme'),
  person(3, 'Cy Reyes', null, null),
  person(4, 'Dee Petrov', 1, 'Acme'),
]
const orgs = [
  { id: 1, name: 'Acme', industry: null, website: null, contact_count: 2, open_deal_count: 0, open_value: 0 },
  { id: 2, name: 'Northwind', industry: null, website: null, contact_count: 1, open_deal_count: 0, open_value: 0 },
]

function routes(extra = {}) {
  return mockApi({
    'GET /pipeline': { stages, columns: [], totals: {} },
    'GET /organizations': orgs,
    'GET /contacts': contacts,
    ...extra,
  })
}

async function chooseStage(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('combobox', { name: 'Stage' }))
  await user.click(await screen.findByRole('option', { name: label }))
}

describe('DealForm', () => {
  it('[R10] requires name, value and close date; checks value and probability limits', async () => {
    const { calls } = routes()
    renderWithProviders(<DealForm onSaved={vi.fn()} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await waitFor(() => expect(screen.getByLabelText('Probability (%)')).toHaveValue('6'))
    await user.click(screen.getByRole('button', { name: 'Add deal' }))
    expect(await screen.findAllByText('Required')).toHaveLength(3)

    await user.type(screen.getByLabelText('Value ($)'), '10.5')
    await user.clear(screen.getByLabelText('Probability (%)'))
    await user.type(screen.getByLabelText('Probability (%)'), '101')
    await user.click(screen.getByRole('button', { name: 'Add deal' }))
    expect(await screen.findByText('Enter whole dollars, 0 or more')).toBeInTheDocument()
    expect(screen.getByText('Enter a whole number from 0 to 100')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Value ($)'))
    await user.type(screen.getByLabelText('Value ($)'), '-5')
    await user.click(screen.getByRole('button', { name: 'Add deal' }))
    expect(await screen.findByText('Enter whole dollars, 0 or more')).toBeInTheDocument()
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('[R23, R24] changing the stage fills in its probability from the API, which can then be overridden', async () => {
    const { calls } = routes({ 'POST /deals': { id: 3 } })
    const onSaved = vi.fn()
    renderWithProviders(<DealForm onSaved={onSaved} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    const probability = screen.getByLabelText('Probability (%)')
    await waitFor(() => expect(probability).toHaveValue('6'))
    await chooseStage(user, 'Proposal')
    expect(probability).toHaveValue('41')
    await user.clear(probability)
    await user.type(probability, '55')
    await user.type(screen.getByLabelText('Name'), 'Fleet pilot')
    await user.type(screen.getByLabelText('Value ($)'), '45000')
    fireEvent.change(screen.getByLabelText('Close date'), { target: { value: '2026-12-31' } })
    await user.click(screen.getByRole('button', { name: 'Add deal' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      name: 'Fleet pilot',
      organization_id: null,
      contact_id: null,
      stage: 'proposal',
      value: 45000,
      probability: 55,
      close_date: '2026-12-31',
    })
  })

  it("[R24] starts at the column's stage and probability when added from the board", async () => {
    routes()
    renderWithProviders(<DealForm defaults={{ stage: 'negotiation' }} lockStage onSaved={vi.fn()} onCancel={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Probability (%)')).toHaveValue('71'))
    expect(screen.getByRole('combobox', { name: 'Stage' })).toBeDisabled()
  })

  it("[K11] the contact picker lists the organization's contacts first, then everyone else", async () => {
    expect(contactOptions(contacts, 1).map((o) => [o.label, o.group])).toEqual([
      ['Ben Okafor', 'At Acme'],
      ['Dee Petrov', 'At Acme'],
      ['Ada Lane', 'Everyone else'],
      ['Cy Reyes', 'Everyone else'],
    ])
    expect(contactOptions(contacts, null).map((o) => o.label)).toEqual([
      'Ada Lane',
      'Ben Okafor',
      'Cy Reyes',
      'Dee Petrov',
    ])

    routes()
    renderWithProviders(<DealForm defaults={{ organization_id: 1 }} onSaved={vi.fn()} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('combobox', { name: /Main contact/ }))
    const options = await screen.findAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual([
      'No main contact',
      'Ben OkaforAcme',
      'Dee PetrovAcme',
      'Ada LaneNorthwind',
      'Cy Reyes',
    ])
  })
})
