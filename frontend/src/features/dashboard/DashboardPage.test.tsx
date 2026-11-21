import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { giveChartsASize } from '@/test/dashboardChartLayout'
import { mockApi, renderWithProviders } from '@/test/render'
import { data } from './DashboardPage.test.data'
import { DashboardPage, greeting } from './DashboardPage'

function setup(extra = {}) {
  const api = mockApi({ 'GET /dashboard': data, ...extra })
  renderWithProviders(<DashboardPage />)
  return api
}

describe('DashboardPage', () => {
  it("[R36] the feature panel shows the API's figures", async () => {
    setup()
    expect(await screen.findByTestId('open-value')).toHaveTextContent('$806,000')
    expect(screen.getByTestId('open-expected')).toHaveTextContent('$277,625')
    expect(screen.getByTestId('won-this-month')).toHaveTextContent('$72,000')
    expect(screen.getByTestId('win-rate')).toHaveTextContent('68%')
    expect(screen.getByTestId('follow-ups-overdue')).toHaveTextContent('3 of 7')
  })

  it('[R39, K15] the strip has the four open stages with their figures, and clicking it goes to the board', async () => {
    setup()
    const strip = await screen.findByTestId('pipeline-strip')
    expect(strip.querySelectorAll('[data-stage]')).toHaveLength(4)
    const stages = screen.getAllByTestId('strip-stage')
    expect(stages.map((s) => s.textContent)).toEqual([
      'New5$138,500$6,925 expected',
      'Qualified4$232,000$46,400 expected',
      'Proposal4$268,500$107,400 expected',
      'Negotiation3$167,000$116,900 expected',
    ])
    await userEvent.click(strip)
    expect(screen.getByTestId('location')).toHaveTextContent('/pipeline')
  })

  it('[R41] follow-ups are in order with the right chips, linked to what they are on', async () => {
    setup()
    const rows = await screen.findAllByTestId('follow-up')
    expect(rows.map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual([
      'Send revised SOW',
      'Prep negotiation call',
      'Demo for clinical leads',
    ])
    expect(within(rows[0]).getByText('Overdue · Nov 11')).toHaveAttribute('data-status', 'overdue')
    expect(within(rows[1]).getByText('Today')).toHaveAttribute('data-status', 'today')
    expect(within(rows[2]).getByText('Nov 17')).toHaveAttribute('data-status', 'upcoming')
    expect(within(rows[0]).getByRole('link', { name: 'ERP integration' })).toHaveAttribute('href', '/deals/4')
    expect(within(rows[2]).getByRole('link', { name: 'Ana Petrov' })).toHaveAttribute('href', '/contacts/9')
  })

  it('[R41] marking a follow-up done saves it', async () => {
    const { calls } = setup({ 'PATCH /activities/2': { id: 2 } })
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Mark done: Prep negotiation call' }))
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({ path: '/activities/2', body: { done: true } }),
    )
  })

  it('[R42] recent activity lists entries with links and stage-colored dots', async () => {
    setup()
    const items = await screen.findAllByTestId('recent-entry')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByRole('link', { name: 'Warehouse scanners rollout' })).toHaveAttribute(
      'href',
      '/deals/6',
    )
    expect(items[0].querySelector('span[aria-hidden]')!.className).toContain('bg-stage-negotiation')
    expect(within(items[0]).getByText('Today, 9:42')).toBeInTheDocument()
    expect(within(items[1]).getByText('Yesterday')).toBeInTheDocument()
  })

  it('[R37, R38, R40] the charts render with the right number of points and bars', async () => {
    giveChartsASize()
    setup()
    const revenue = await screen.findByTestId('revenue-chart')
    await waitFor(() => expect(revenue.querySelector('.recharts-area-curve')).not.toBeNull())
    const d = revenue.querySelector('.recharts-area-curve')!.getAttribute('d')!
    expect(d.match(/[ML]/g)).toHaveLength(12)
    const bars = screen.getByTestId('won-lost-chart').querySelectorAll('.recharts-bar-rectangle')
    expect(bars).toHaveLength(24)
    const funnel = screen.getByTestId('funnel-chart')
    expect(funnel.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(5)
    expect(funnel.textContent).toContain('$2.84M')
    expect(funnel.textContent).toContain('71%')
  })

  it('[R36] greets by the time of day', () => {
    expect(greeting(new Date(2026, 10, 15, 9))).toBe('Good morning')
    expect(greeting(new Date(2026, 10, 15, 14))).toBe('Good afternoon')
    expect(greeting(new Date(2026, 10, 15, 19))).toBe('Good evening')
  })
  it('[R36] says so while loading, and when the dashboard cannot load', async () => {
    let fail: (r: Response) => void = () => {}
    setup({ 'GET /dashboard': () => new Promise<Response>((resolve) => (fail = resolve)) })
    expect(await screen.findByText('Loading…')).toBeInTheDocument()
    fail(new Response(JSON.stringify({ detail: 'Boom' }), { status: 500 }))
    expect(await screen.findByText("Couldn't load the dashboard.")).toBeInTheDocument()
    expect(screen.queryByText('Loading…')).toBeNull()
    expect(screen.queryByTestId('open-value')).toBeNull()
  })

  it('[R43] asks the server for the figures each time the page opens', async () => {
    const { calls } = setup()
    await screen.findByTestId('open-value')
    expect(calls.filter((c) => c.method === 'GET' && c.path === '/dashboard')).toHaveLength(1)
  })

  it('[R41] tells the user when marking a follow-up done fails', async () => {
    const error = vi.spyOn(toast, 'error')
    setup({ 'PATCH /activities/1': new Response(JSON.stringify({ detail: 'Activity not found' }), { status: 404 }) })
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Mark done: Send revised SOW' }))
    await waitFor(() => expect(error).toHaveBeenCalledWith('Activity not found'))
  })

  it('[R41] confirms a follow-up marked done', async () => {
    const success = vi.spyOn(toast, 'success')
    setup({ 'PATCH /activities/3': { id: 3 } })
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Mark done: Demo for clinical leads' }))
    await waitFor(() => expect(success).toHaveBeenCalledWith('Follow-up marked done'))
  })

  it('[K14] Log activity opens a side panel that asks for a contact or deal, and Cancel closes it', async () => {
    setup({ 'GET /contacts': [], 'GET /deals': [] })
    await screen.findByTestId('open-value')
    await userEvent.click(screen.getByRole('button', { name: 'Log activity' }))
    const sheet = await screen.findByRole('dialog', { name: 'Log activity' })
    expect(within(sheet).getByRole('form', { name: 'Log activity' })).toBeInTheDocument()
    expect(within(sheet).getByRole('combobox', { name: 'On' })).toBeInTheDocument()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('[K14] logging an activity from the dashboard saves it and closes the panel', async () => {
    const { calls } = setup({
      'GET /contacts': [{ id: 3, name: 'Ada Lane', organization_name: 'Acme' }],
      'GET /deals': [],
      'POST /activities': { id: 99 },
    })
    await screen.findByTestId('open-value')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Log activity' }))
    const sheet = await screen.findByRole('dialog', { name: 'Log activity' })
    await user.click(within(sheet).getByRole('combobox', { name: 'On' }))
    await user.click(await screen.findByRole('option', { name: /Ada Lane/ }))
    await user.type(within(sheet).getByLabelText('What happened'), 'Quick check in')
    await user.click(within(sheet).getByRole('button', { name: 'Log activity' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls.find((c) => c.method === 'POST')!.body).toMatchObject({ contact_id: 3, description: 'Quick check in' })
  })

  it('[R44] Add deal opens a side panel; saving adds the deal and closes it', async () => {
    const success = vi.spyOn(toast, 'success')
    const { calls } = setup({
      'GET /organizations': [],
      'GET /contacts': [],
      'GET /pipeline': {
        stages: [
          { key: 'new', label: 'New', probability: 10, open: true },
          { key: 'qualified', label: 'Qualified', probability: 25, open: true },
        ],
      },
      'POST /deals': { id: 40, name: 'Fleet pilot' },
    })
    await screen.findByTestId('open-value')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Add deal' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add deal' })
    await waitFor(() => expect(within(sheet).getByLabelText('Probability (%)')).toHaveValue('10'))
    await user.type(within(sheet).getByLabelText('Name'), 'Fleet pilot')
    await user.type(within(sheet).getByLabelText('Value ($)'), '45000')
    await user.type(within(sheet).getByLabelText('Close date'), '2026-12-31')
    await user.click(within(sheet).getByRole('button', { name: 'Add deal' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(success).toHaveBeenCalledWith('Deal added')
    expect(calls.find((c) => c.method === 'POST')).toMatchObject({
      path: '/deals',
      body: { name: 'Fleet pilot', stage: 'new', value: 45000, probability: 10, close_date: '2026-12-31' },
    })
  })

  it('[R44] cancelling Add deal closes the panel without saving', async () => {
    const { calls } = setup({ 'GET /organizations': [], 'GET /contacts': [], 'GET /pipeline': { stages: [] } })
    await screen.findByTestId('open-value')
    await userEvent.click(screen.getByRole('button', { name: 'Add deal' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add deal' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls.some((c) => c.method === 'POST')).toBe(false)
  })
  it('[R44] Escape closes the side panel', async () => {
    setup({ 'GET /organizations': [], 'GET /contacts': [], 'GET /pipeline': { stages: [] } })
    await screen.findByTestId('open-value')
    await userEvent.click(screen.getByRole('button', { name: 'Add deal' }))
    await screen.findByRole('dialog', { name: 'Add deal' })
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
