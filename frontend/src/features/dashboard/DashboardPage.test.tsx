import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockApi, renderWithProviders } from '@/test/render'
import { data } from './DashboardPage.test.data'
import { DashboardPage, greeting } from './DashboardPage'

function setup(extra = {}) {
  const api = mockApi({ 'GET /dashboard': data, ...extra })
  renderWithProviders(<DashboardPage />)
  return api
}

describe('DashboardPage', () => {
  it('[R36] the feature panel shows the API\'s figures', async () => {
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
      'New5$138,500$6,925 expected', 'Qualified4$232,000$46,400 expected', 'Proposal4$268,500$107,400 expected', 'Negotiation3$167,000$116,900 expected',
    ])
    await userEvent.click(strip)
    expect(screen.getByTestId('location')).toHaveTextContent('/pipeline')
  })

  it('[R41] follow-ups are in order with the right chips, linked to what they are on', async () => {
    setup()
    const rows = await screen.findAllByTestId('follow-up')
    expect(rows.map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual(['Send revised SOW', 'Prep negotiation call', 'Demo for clinical leads'])
    expect(within(rows[0]).getByText('Overdue · Nov 11')).toHaveAttribute('data-status', 'overdue')
    expect(within(rows[1]).getByText('Today')).toHaveAttribute('data-status', 'today')
    expect(within(rows[2]).getByText('Nov 17')).toHaveAttribute('data-status', 'upcoming')
    expect(within(rows[0]).getByRole('link', { name: 'ERP integration' })).toHaveAttribute('href', '/deals/4')
    expect(within(rows[2]).getByRole('link', { name: 'Ana Petrov' })).toHaveAttribute('href', '/contacts/9')
  })

  it('[R41] marking a follow-up done saves it', async () => {
    const { calls } = setup({ 'PATCH /activities/2': { id: 2 } })
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Mark done: Prep negotiation call' }))
    await waitFor(() => expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({ path: '/activities/2', body: { done: true } }))
  })

  it('[R42] recent activity lists entries with links and stage-colored dots', async () => {
    setup()
    const items = await screen.findAllByTestId('recent-entry')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByRole('link', { name: 'Warehouse scanners rollout' })).toHaveAttribute('href', '/deals/6')
    expect(items[0].querySelector('span[aria-hidden]')!.className).toContain('bg-stage-negotiation')
    expect(within(items[0]).getByText('Today, 9:42')).toBeInTheDocument()
    expect(within(items[1]).getByText('Yesterday')).toBeInTheDocument()
  })

  it('[R37, R38, R40] the charts render with the right number of points and bars', async () => {
    // jsdom has no layout, so give Recharts' container the size it would have in the page.
    const size = { width: 420, height: 200, top: 0, left: 0, right: 420, bottom: 200, x: 0, y: 0, toJSON: () => ({}) }
    const original = HTMLElement.prototype.getBoundingClientRect
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('recharts-responsive-container') || this.parentElement?.classList.contains('recharts-responsive-container')
        ? (size as DOMRect)
        : original.call(this)
    })
    for (const prop of ['clientWidth', 'offsetWidth'] as const) vi.spyOn(HTMLElement.prototype, prop, 'get').mockReturnValue(420)
    for (const prop of ['clientHeight', 'offsetHeight'] as const) vi.spyOn(HTMLElement.prototype, prop, 'get').mockReturnValue(200)
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
})
