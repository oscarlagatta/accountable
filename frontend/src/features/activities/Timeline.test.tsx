import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { mockApi, renderWithProviders } from '@/test/render'
import type { TimelineEntry } from './api'
import { Timeline } from './Timeline'

const base = {
  follow_up_date: null,
  done: false,
  from_stage: null,
  to_stage: null,
  contact_id: null,
  contact_name: null,
  deal_id: null,
  deal_name: null,
}
const entries: TimelineEntry[] = [
  {
    ...base,
    id: 5,
    kind: 'stage_change',
    description: 'Moved from Proposal to Negotiation',
    occurred_at: '2026-11-14T15:00:00',
    from_stage: 'proposal',
    to_stage: 'negotiation',
    deal_id: 12,
    deal_name: 'Fleet pilot',
  },
  {
    ...base,
    id: 4,
    kind: 'email',
    description: 'Sent pricing',
    occurred_at: '2026-11-13T10:00:00',
    deal_id: 12,
    deal_name: 'Fleet pilot',
    follow_up_date: '2026-11-11',
  },
  {
    ...base,
    id: 3,
    kind: 'call',
    description: 'Intro call',
    occurred_at: '2026-11-10T09:00:00',
    contact_id: 3,
    contact_name: 'Ada Lane',
    follow_up_date: '2026-11-20',
  },
  {
    ...base,
    id: 2,
    kind: 'note',
    description: 'Met at the expo',
    occurred_at: '2026-11-01T09:00:00',
    contact_id: 3,
    contact_name: 'Ada Lane',
  },
]

function items() {
  return within(screen.getByRole('list', { name: 'Timeline' })).getAllByTestId('timeline-entry')
}

describe('Timeline', () => {
  it('[R20] lists entries newest first with the right icon per kind, and a deal link on a contact timeline', async () => {
    mockApi({ 'GET /contacts/3/timeline': entries })
    renderWithProviders(<Timeline owner={{ kind: 'contact', id: 3 }} today="2026-11-15" />)
    await screen.findByText('Intro call')
    expect(items().map((li) => within(li).getByRole('img').getAttribute('aria-label'))).toEqual([
      'Stage change',
      'Email',
      'Call',
      'Note',
    ])
    expect(items().map((li) => li.querySelector('p')!.textContent)).toEqual([
      'Moved from Proposal to Negotiation',
      'Sent pricing',
      'Intro call',
      'Met at the expo',
    ])
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
    const { calls } = mockApi({
      'GET /contacts/3/timeline': entries,
      'PATCH /activities/4': { ...entries[1], done: true },
    })
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
  it('[R21] a follow-up already done is struck through, with no Mark done', async () => {
    mockApi({ 'GET /deals/12/timeline': [{ ...entries[1], done: true }] })
    renderWithProviders(<Timeline owner={{ kind: 'deal', id: 12 }} today="2026-11-15" />)
    expect(await screen.findByText('Follow-up done')).toBeInTheDocument()
    const chip = screen.getByText('Nov 11')
    expect(chip.className).toContain('line-through')
    expect(chip).not.toHaveAttribute('data-status')
    expect(screen.queryByRole('button', { name: 'Mark done' })).toBeNull()
  })

  it('[R21] a follow-up due today says Today', async () => {
    mockApi({ 'GET /deals/12/timeline': [{ ...entries[1], follow_up_date: '2026-11-15' }] })
    renderWithProviders(<Timeline owner={{ kind: 'deal', id: 12 }} today="2026-11-15" />)
    const chip = await screen.findByText('Today')
    expect(chip).toHaveAttribute('data-status', 'today')
    expect(chip.className).toContain('bg-marigold')
  })

  it('[R21] tells the user when Mark done fails', async () => {
    const error = vi.spyOn(toast, 'error')
    mockApi({
      'GET /deals/12/timeline': [entries[1]],
      'PATCH /activities/4': new Response(JSON.stringify({ detail: 'Activity not found' }), { status: 404 }),
    })
    renderWithProviders(<Timeline owner={{ kind: 'deal', id: 12 }} today="2026-11-15" />)
    await userEvent.click(await screen.findByRole('button', { name: 'Mark done' }))
    await waitFor(() => expect(error).toHaveBeenCalledWith('Activity not found'))
  })

  it('[R21] edit opens the entry in place; Cancel puts it back', async () => {
    mockApi({ 'GET /contacts/3/timeline': entries })
    renderWithProviders(<Timeline owner={{ kind: 'contact', id: 3 }} today="2026-11-15" />)
    await screen.findByText('Intro call')
    await userEvent.click(within(items()[2]).getByRole('button', { name: 'Edit activity' }))
    const form = screen.getByRole('form', { name: 'Edit activity' })
    expect(within(form).getByLabelText('What happened')).toHaveValue('Intro call')
    expect(within(form).getByRole('radio', { name: 'Call' })).toHaveAttribute('aria-checked', 'true')
    expect(items()).toHaveLength(3)
    await userEvent.click(within(form).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('form', { name: 'Edit activity' })).toBeNull()
    expect(items()).toHaveLength(4)
  })

  it('[R21] saving an edit sends the change and closes the form', async () => {
    const { calls } = mockApi({
      'GET /contacts/3/timeline': entries,
      'PATCH /activities/2': { ...entries[3], description: 'Met at the trade expo' },
    })
    renderWithProviders(<Timeline owner={{ kind: 'contact', id: 3 }} today="2026-11-15" />)
    await screen.findByText('Met at the expo')
    const user = userEvent.setup()
    await user.click(within(items()[3]).getByRole('button', { name: 'Edit activity' }))
    const form = screen.getByRole('form', { name: 'Edit activity' })
    const description = within(form).getByLabelText('What happened')
    await user.clear(description)
    await user.type(description, 'Met at the trade expo')
    await user.click(within(form).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Edit activity' })).toBeNull())
    expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({
      path: '/activities/2',
      body: { kind: 'note', description: 'Met at the trade expo' },
    })
  })

  it('[R20] says so while loading, and when the timeline cannot load', async () => {
    let answer: (r: Response) => void = () => {}
    mockApi({ 'GET /deals/1/timeline': () => new Promise<Response>((resolve) => (answer = resolve)) })
    renderWithProviders(<Timeline owner={{ kind: 'deal', id: 1 }} />)
    expect(await screen.findByText('Loading…')).toBeInTheDocument()
    answer(new Response(JSON.stringify({ detail: 'Boom' }), { status: 500 }))
    expect(await screen.findByText("Couldn't load the timeline.")).toBeInTheDocument()
  })

  it('[R22] a stage change with no target stage still shows its icon', async () => {
    mockApi({ 'GET /deals/12/timeline': [{ ...entries[0], to_stage: null }] })
    renderWithProviders(<Timeline owner={{ kind: 'deal', id: 12 }} today="2026-11-15" />)
    await screen.findByText('Moved from Proposal to Negotiation')
    expect(screen.getByRole('img', { name: 'Stage change' })).toHaveAttribute('data-kind', 'stage_change')
  })
})
