import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from '@/components/ui/sonner'
import { mockApi, renderWithProviders } from '@/test/render'
import type { Deal } from './api'
import { DealsPage, dealConsequences } from './DealsPage'

const deal = (id: number, name: string, extra: Partial<Deal> = {}): Deal => ({
  id,
  name,
  organization_id: 4,
  organization_name: 'Harbor Freight Lines',
  contact_id: 9,
  contact_name: 'Maya Okafor',
  stage: 'proposal',
  value: 10000,
  probability: 40,
  expected_revenue: 4000,
  close_date: '2026-12-31',
  late: false,
  position: 0,
  ...extra,
})
const deals = [
  deal(1, 'Fleet pilot', { stage: 'negotiation', value: 45000, probability: 70, expected_revenue: 31500 }),
  deal(2, 'Annual renewal', {
    organization_id: null,
    organization_name: null,
    contact_id: null,
    contact_name: null,
    stage: 'new',
    late: true,
    close_date: '2026-11-01',
  }),
  deal(3, 'Cold storage', { stage: 'won', probability: 100, expected_revenue: 10000 }),
]
// Labels that differ from the built-in ones, to prove the table uses the API's stage list.
const stages = [
  { key: 'new', label: 'Fresh', probability: 5, open: true },
  { key: 'qualified', label: 'Qualified', probability: 20, open: true },
  { key: 'proposal', label: 'Proposal', probability: 40, open: true },
  { key: 'negotiation', label: 'Haggling', probability: 70, open: true },
  { key: 'won', label: 'Won', probability: 100, open: false },
  { key: 'lost', label: 'Lost', probability: 0, open: false },
]

function routes(extra = {}) {
  return mockApi({
    'GET /deals': deals,
    'GET /pipeline': { stages },
    'GET /organizations': [],
    'GET /contacts': [],
    ...extra,
  })
}

function renderPage() {
  return renderWithProviders(
    <>
      <DealsPage />
      <Toaster />
    </>,
  )
}

function names() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getAllByRole('cell')[0].textContent)
}

describe('DealsPage', () => {
  it('[R7] lists every deal with its organization, contact, stage, value, probability, expected revenue and close date', async () => {
    routes()
    renderPage()
    expect(await screen.findByText('Fleet pilot')).toBeInTheDocument()
    expect(screen.getByText('3 deals, open and closed')).toBeInTheDocument()
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual([
      expect.stringContaining('Name'),
      'Organization',
      'Main contact',
      'Stage',
      'Value',
      'Probability',
      'Expected revenue',
      'Close date',
      '',
    ])
    // Default sort is by name, A to Z.
    expect(names()).toEqual(['Annual renewal', 'Cold storage', 'Fleet pilot'])

    const fleet = screen.getByRole('row', { name: /Fleet pilot/ })
    const cells = within(fleet)
      .getAllByRole('cell')
      .map((c) => c.textContent)
    expect(cells.slice(0, 8)).toEqual([
      'Fleet pilot',
      'Harbor Freight Lines',
      'Maya Okafor',
      'Haggling',
      '$45,000',
      '70%',
      '$31,500',
      'Dec 31, 2026',
    ])
    expect(await within(fleet).findByText('Haggling')).toBeInTheDocument()
    expect(within(fleet).getByRole('link', { name: 'Harbor Freight Lines' })).toHaveAttribute(
      'href',
      '/organizations/4',
    )
    expect(within(fleet).getByRole('link', { name: 'Maya Okafor' })).toHaveAttribute('href', '/contacts/9')

    const renewal = screen.getByRole('row', { name: /Annual renewal/ })
    expect(within(renewal).getAllByText('None')).toHaveLength(2)
    expect(within(renewal).getByText('Late')).toBeInTheDocument()
    expect(within(renewal).getByText('Nov 1, 2026')).toBeInTheDocument()
  })

  it('[R7] says when it is loading and when there are no deals', async () => {
    let release: (v: Deal[]) => void = () => {}
    routes({ 'GET /deals': () => new Promise<Deal[]>((r) => (release = r)) })
    renderPage()
    expect(screen.getAllByText('Loading…')).toHaveLength(2)
    release([])
    expect(await screen.findByText('No deals yet. Add the first one.')).toBeInTheDocument()
    expect(screen.getByText('0 deals, open and closed')).toBeInTheDocument()
  })

  it('[R8] the search matches the stage name as well as the text columns', async () => {
    routes()
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('Fleet pilot')
    await waitFor(() => expect(screen.getByText('Haggling')).toBeInTheDocument())
    const search = screen.getByRole('searchbox', { name: 'Search deals' })
    await user.type(search, 'haggl')
    expect(names()).toEqual(['Fleet pilot'])
    await user.clear(search)
    await user.type(search, 'maya')
    expect(names()).toEqual(['Cold storage', 'Fleet pilot'])
  })

  it('[R9] sorting by stage follows pipeline order, and close date sorts by date', async () => {
    routes()
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('Fleet pilot')
    await user.click(screen.getByRole('button', { name: 'Stage' }))
    expect(names()).toEqual(['Annual renewal', 'Fleet pilot', 'Cold storage'])
    expect(screen.getByRole('columnheader', { name: /Stage/ })).toHaveAttribute('aria-sort', 'ascending')
    await user.click(screen.getByRole('button', { name: /Stage/ }))
    expect(names()).toEqual(['Cold storage', 'Fleet pilot', 'Annual renewal'])
    await user.click(screen.getByRole('button', { name: 'Close date' }))
    expect(names()[0]).toBe('Annual renewal')
    await user.click(screen.getByRole('button', { name: /Close date/ }))
    expect(names()[2]).toBe('Annual renewal')
    await user.click(screen.getByRole('button', { name: 'Probability' }))
    expect(names()).toEqual(['Annual renewal', 'Fleet pilot', 'Cold storage'])
    await user.click(screen.getByRole('button', { name: 'Expected revenue' }))
    expect(names()).toEqual(['Annual renewal', 'Cold storage', 'Fleet pilot'])
  })

  it('[R10] Add deal opens the form in a side panel; saving adds it and closes the panel', async () => {
    const added = deal(4, 'New fleet', { stage: 'new', value: 5000, probability: 5, expected_revenue: 250 })
    let list = deals
    const { calls } = routes({
      'GET /deals': () => list,
      'POST /deals': () => {
        list = [...deals, added]
        return added
      },
    })
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('Fleet pilot')
    await user.click(screen.getByRole('button', { name: 'Add deal' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add deal' })
    await waitFor(() => expect(within(sheet).getByLabelText('Probability (%)')).toHaveValue('5'))
    await user.type(within(sheet).getByLabelText('Name'), 'New fleet')
    await user.type(within(sheet).getByLabelText('Value ($)'), '5000')
    fireEvent.change(within(sheet).getByLabelText('Close date'), { target: { value: '2027-01-15' } })
    await user.click(within(sheet).getByRole('button', { name: 'Add deal' }))
    expect(await screen.findByText('Deal added')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add deal' })).toBeNull())
    expect(calls.find((c) => c.method === 'POST')!.body).toMatchObject({ name: 'New fleet', value: 5000, stage: 'new' })
    expect(await screen.findByText('New fleet')).toBeInTheDocument()
    expect(screen.getByText('4 deals, open and closed')).toBeInTheDocument()
  })

  it('[R11] the edit action opens the deal in the form and saves it; Cancel closes without saving', async () => {
    const { calls } = routes({ 'PATCH /deals/1': (body: object) => ({ ...deals[0], ...body }) })
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('Fleet pilot')

    await user.click(screen.getByRole('button', { name: 'Edit Fleet pilot' }))
    let sheet = await screen.findByRole('dialog', { name: 'Edit deal' })
    expect(within(sheet).getByLabelText('Name')).toHaveValue('Fleet pilot')
    await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit deal' })).toBeNull())

    // Escape closes the panel too.
    await user.click(screen.getByRole('button', { name: 'Edit Fleet pilot' }))
    await screen.findByRole('dialog', { name: 'Edit deal' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit deal' })).toBeNull())

    await user.click(screen.getByRole('button', { name: 'Edit Fleet pilot' }))
    sheet = await screen.findByRole('dialog', { name: 'Edit deal' })
    await user.clear(within(sheet).getByLabelText('Name'))
    await user.type(within(sheet).getByLabelText('Name'), 'Fleet rollout')
    await user.click(within(sheet).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Deal saved')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit deal' })).toBeNull())
    const patch = calls.filter((c) => c.method === 'PATCH')
    expect(patch).toHaveLength(1)
    expect(patch[0].body).toMatchObject({ name: 'Fleet rollout' })
  })

  it('[R11] clicking a row opens the deal page', async () => {
    routes()
    renderPage()
    const user = userEvent.setup()
    await user.click(await screen.findByText('Cold storage'))
    expect(screen.getByTestId('location')).toHaveTextContent('/deals/3')
  })

  it('[R12] delete asks first, naming the deal and counting what goes with it', async () => {
    let list = deals
    const { calls } = routes({
      'GET /deals': () => list,
      'GET /deals/1/delete-preview': { name: 'Fleet pilot', activities: 3, stage_changes: 1 },
      'DELETE /deals/1': () => {
        list = deals.slice(1)
        return undefined
      },
    })
    renderPage()
    const user = userEvent.setup()
    await screen.findByText('Fleet pilot')

    await user.click(screen.getByRole('button', { name: 'Delete Fleet pilot' }))
    let dialog = await screen.findByRole('alertdialog', { name: 'Delete Fleet pilot?' })
    expect(within(dialog).getByText('3 activities will be deleted.')).toBeInTheDocument()
    expect(within(dialog).getByText('1 stage change will be deleted from its history.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(calls.filter((c) => c.method === 'DELETE')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Delete Fleet pilot' }))
    dialog = await screen.findByRole('alertdialog', { name: 'Delete Fleet pilot?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('Deal deleted')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(calls.filter((c) => c.method === 'DELETE').map((c) => c.path)).toEqual(['/deals/1'])
    await waitFor(() => expect(names()).toEqual(['Annual renewal', 'Cold storage']))
  })

  it('[R12] the delete dialog says when nothing else is linked, and counts in the singular and plural', () => {
    expect(dealConsequences({ activities: 0, stage_changes: 0 })).toEqual(['No activities are linked to it.'])
    expect(dealConsequences({ activities: 1, stage_changes: 2 })).toEqual([
      '1 activity will be deleted.',
      '2 stage changes will be deleted from its history.',
    ])
  })
})
