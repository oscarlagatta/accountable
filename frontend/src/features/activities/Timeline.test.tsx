import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockApi, renderWithProviders } from '@/test/render'
import type { TimelineEntry } from './api'
import { Timeline } from './Timeline'

const base = { follow_up_date: null, done: false, from_stage: null, to_stage: null, contact_id: null, contact_name: null, deal_id: null, deal_name: null }
const entries: TimelineEntry[] = [
  { ...base, id: 5, kind: 'stage_change', description: 'Moved from Proposal to Negotiation', occurred_at: '2026-11-14T15:00:00', from_stage: 'proposal', to_stage: 'negotiation', deal_id: 12, deal_name: 'Fleet pilot' },
  { ...base, id: 4, kind: 'email', description: 'Sent pricing', occurred_at: '2026-11-13T10:00:00', deal_id: 12, deal_name: 'Fleet pilot', follow_up_date: '2026-11-11' },
  { ...base, id: 3, kind: 'call', description: 'Intro call', occurred_at: '2026-11-10T09:00:00', contact_id: 3, contact_name: 'Ada Lane', follow_up_date: '2026-11-20' },
  { ...base, id: 2, kind: 'note', description: 'Met at the expo', occurred_at: '2026-11-01T09:00:00', contact_id: 3, contact_name: 'Ada Lane' },
]

function items() {
  return within(screen.getByRole('list', { name: 'Timeline' })).getAllByTestId('timeline-entry')
}

describe('Timeline', () => {
  it('[R20] lists entries newest first with the right icon per kind, and a deal link on a contact timeline', async () => {
    mockApi({ 'GET /contacts/3/timeline': entries })
    renderWithProviders(<Timeline owner={{ kind: 'contact', id: 3 }} today="2026-11-15" />)
    await screen.findByText('Intro call')
    expect(items().map((li) => within(li).getByRole('img').getAttribute('aria-label'))).toEqual(['Stage change', 'Email', 'Call', 'Note'])
    expect(items().map((li) => li.querySelector('p')!.textContent)).toEqual(['Moved from Proposal to Negotiation', 'Sent pricing', 'Intro call', 'Met at the expo'])
    const links = screen.getAllByRole('link', { name: 'Fleet pilot' })
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/deals/12')
  })

  it('[R20] a deal timeline has no deal links', async () => {
    mockApi({ 'GET /deals/12/timeline': entries.slice(0, 2) })
    renderWithProviders(<Timeline owner={{ kind: 'deal', id: 12 }} today="2026-11-15" />)
    await screen.findByText('Sent pricing')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('[R22, K10] stage changes have no edit or delete; other entries do', async () => {
    mockApi({ 'GET /contacts/3/timeline': entries })
    renderWithProviders(<Timeline owner={{ kind: 'contact', id: 3 }} today="2026-11-15" />)
    await screen.findByText('Intro call')
    const [stage, ...rest] = items()
    expect(within(stage).queryByRole('button', { name: 'Edit activity' })).toBeNull()
    expect(within(stage).queryByRole('button', { name: 'Delete activity' })).toBeNull()
    for (const li of rest) {
      expect(within(li).getByRole('button', { name: 'Edit activity' })).toBeInTheDocument()
      expect(within(li).getByRole('button', { name: 'Delete activity' })).toBeInTheDocument()
    }
  })

  it('[R21] overdue follow-ups are in Raspberry with Mark done, which saves', async () => {
    const { calls } = mockApi({ 'GET /contacts/3/timeline': entries, 'PATCH /activities/4': { ...entries[1], done: true } })
    renderWithProviders(<Timeline owner={{ kind: 'contact', id: 3 }} today="2026-11-15" />)
    await screen.findByText('Intro call')
    const overdue = screen.getByText('Overdue · Nov 11')
    expect(overdue).toHaveAttribute('data-status', 'overdue')
    expect(overdue.className).toContain('bg-raspberry')
    expect(screen.getByText('Nov 20')).toHaveAttribute('data-status', 'upcoming')
    await userEvent.click(within(items()[1]).getByRole('button', { name: 'Mark done' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true))
    expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({ path: '/activities/4', body: { done: true } })
  })

  it('[R21] delete asks first, then deletes', async () => {
    const { calls } = mockApi({ 'GET /contacts/3/timeline': entries, 'DELETE /activities/2': undefined })
    renderWithProviders(<Timeline owner={{ kind: 'contact', id: 3 }} today="2026-11-15" />)
    await screen.findByText('Met at the expo')
    await userEvent.click(within(items()[3]).getByRole('button', { name: 'Delete activity' }))
    expect(await screen.findByRole('heading', { name: 'Delete this activity?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/activities/2')).toBe(true))
  })

  it('[R20] says what to do when empty', async () => {
    mockApi({ 'GET /deals/1/timeline': [] })
    renderWithProviders(<Timeline owner={{ kind: 'deal', id: 1 }} />)
    expect(await screen.findByText('No activities yet. Log a call, email or note above.')).toBeInTheDocument()
  })
})
