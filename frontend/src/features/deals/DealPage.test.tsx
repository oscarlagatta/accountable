import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from '@/components/ui/sonner'
import { mockApi, renderWithProviders } from '@/test/render'
import { DealPage } from './DealPage'

const deal = {
  id: 12,
  name: 'Fleet pilot',
  organization_id: 4,
  organization_name: 'Harbor Freight Lines',
  contact_id: 9,
  contact_name: 'Maya Okafor',
  stage: 'negotiation',
  value: 45000,
  probability: 70,
  expected_revenue: 31500,
  close_date: '2026-12-31',
  late: false,
  position: 0,
}
const stages = [{ key: 'negotiation', label: 'Negotiation', probability: 70, open: true }]
const timeline = [
  {
    id: 2,
    kind: 'stage_change',
    description: 'Moved from Proposal to Negotiation',
    occurred_at: '2026-11-14T09:00:00',
    follow_up_date: null,
    done: false,
    from_stage: 'proposal',
    to_stage: 'negotiation',
    contact_id: null,
    contact_name: null,
    deal_id: 12,
    deal_name: 'Fleet pilot',
  },
]

describe('DealPage', () => {
  it('[R17, R18] shows stage, value, probability, expected revenue and close date, links its organization and contact, and has a timeline', async () => {
    mockApi({
      'GET /deals/12': deal,
      'GET /pipeline': { stages },
      'GET /deals/12/timeline': timeline,
      'GET /contacts': [],
      'GET /deals': [],
    })
    renderWithProviders(<DealPage />, { path: '/deals/12', route: '/deals/:id' })
    expect(await screen.findByRole('heading', { name: 'Fleet pilot', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Stage: Negotiation')).toBeInTheDocument()
    const figures = screen.getAllByRole('definition')
    const text = figures.map((f) => f.textContent).join(' | ')
    expect(text).toContain('$45,000')
    expect(text).toContain('70%')
    expect(text).toContain('$31,500')
    expect(text).toContain('Dec 31, 2026')
    for (const link of screen.getAllByRole('link', { name: 'Harbor Freight Lines' }))
      expect(link).toHaveAttribute('href', '/organizations/4')
    for (const link of screen.getAllByRole('link', { name: 'Maya Okafor' }))
      expect(link).toHaveAttribute('href', '/contacts/9')
    const list = await screen.findByRole('list', { name: 'Timeline' })
    expect(within(list).getByText('Moved from Proposal to Negotiation')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Log activity' })).toBeInTheDocument()
  })

  it('[R17] a late deal shows the Late label', async () => {
    mockApi({
      'GET /deals/12': { ...deal, late: true, close_date: '2026-11-01' },
      'GET /pipeline': { stages },
      'GET /deals/12/timeline': [],
    })
    renderWithProviders(<DealPage />, { path: '/deals/12', route: '/deals/:id' })
    expect(await screen.findByText('Late')).toBeInTheDocument()
    expect(await screen.findByText('No activities yet. Log a call, email or note above.')).toBeInTheDocument()
  })

  it('[R17] says when the deal is not found, with a way back to the list', async () => {
    mockApi({ 'GET /pipeline': { stages } })
    renderWithProviders(<DealPage />, { path: '/deals/404', route: '/deals/:id' })
    expect(await screen.findByRole('heading', { name: 'Deal not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to deals' })).toHaveAttribute('href', '/deals')
  })

  it("[R17] says when the deal couldn't be loaded", async () => {
    mockApi({
      'GET /deals/50': () => new Response(JSON.stringify({ detail: 'Boom' }), { status: 500 }),
      'GET /pipeline': { stages },
    })
    renderWithProviders(<DealPage />, { path: '/deals/50', route: '/deals/:id' })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByText("Couldn't load this deal.")).toBeInTheDocument()
  })

  it('[R17] a won deal with no organization or contact shows None and its closed date', async () => {
    mockApi({
      'GET /deals/14': {
        ...deal,
        id: 14,
        stage: 'won',
        organization_id: null,
        organization_name: null,
        contact_id: null,
        contact_name: null,
      },
      'GET /pipeline': { stages },
      'GET /deals/14/timeline': [],
    })
    renderWithProviders(<DealPage />, { path: '/deals/14', route: '/deals/:id' })
    expect(await screen.findByRole('heading', { name: 'Fleet pilot', level: 1 })).toBeInTheDocument()
    // The stage list has no label for Won, so the built-in label is used.
    expect(screen.getByText('Stage: Won')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.getByText(/Deal with None · Main contact None/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Harbor Freight Lines' })).toBeNull()
  })

  it('[R17] Edit opens the deal in a side panel and saves it', async () => {
    const { calls } = mockApi({
      'GET /deals/15': { ...deal, id: 15 },
      'GET /pipeline': { stages },
      'GET /deals/15/timeline': [],
      'GET /organizations': [],
      'GET /contacts': [],
      'PATCH /deals/15': (body: object) => ({ ...deal, id: 15, ...body }),
    })
    renderWithProviders(
      <>
        <DealPage />
        <Toaster />
      </>,
      { path: '/deals/15', route: '/deals/:id' },
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    let sheet = await screen.findByRole('dialog', { name: 'Edit deal' })
    await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit deal' })).toBeNull())

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    sheet = await screen.findByRole('dialog', { name: 'Edit deal' })
    expect(within(sheet).getByLabelText('Name')).toHaveValue('Fleet pilot')
    await user.clear(within(sheet).getByLabelText('Value ($)'))
    await user.type(within(sheet).getByLabelText('Value ($)'), '50000')
    await user.click(within(sheet).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Deal saved')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit deal' })).toBeNull())
    expect(calls.find((c) => c.method === 'PATCH')!.body).toMatchObject({ value: 50000 })
  })

  it('[R12, R17] Delete asks first, then deletes the deal and returns to the list', async () => {
    const { calls } = mockApi({
      'GET /deals/16': { ...deal, id: 16 },
      'GET /pipeline': { stages },
      'GET /deals/16/timeline': [],
      'GET /deals/16/delete-preview': { name: 'Fleet pilot', activities: 0, stage_changes: 0 },
      'DELETE /deals/16': undefined,
      'GET /deals': [],
    })
    renderWithProviders(<DealPage />, { path: '/deals/16', route: '/deals/:id' })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Fleet pilot?' })
    expect(within(dialog).getByText('No activities are linked to it.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/deals'))
    expect(calls.filter((c) => c.method === 'DELETE').map((c) => c.path)).toEqual(['/deals/16'])
  })
})
