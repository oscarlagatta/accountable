import { screen, within } from '@testing-library/react'
import type { TimelineEntry } from '@/features/activities/api'
import { renderWithProviders } from '@/test/render'
import { data } from './DashboardPage.test.data'
import { FollowUps, RecentActivity } from './Lists'

const loose: TimelineEntry = {
  id: 30,
  kind: 'stage_change',
  description: 'Moved to a stage',
  occurred_at: '2025-03-02T10:00:00',
  follow_up_date: null,
  done: false,
  from_stage: null,
  to_stage: null,
  contact_id: null,
  contact_name: null,
  deal_id: null,
  deal_name: null,
}

describe('Dashboard lists', () => {
  it('[R41] says what to do when there are no follow-ups', () => {
    renderWithProviders(<FollowUps items={[]} today={data.today} />)
    expect(screen.getByText('Nothing to follow up. Add a follow-up date when you log an activity.')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Follow-ups' })).toBeNull()
  })

  it('[R42] says so when there is no activity yet', () => {
    renderWithProviders(<RecentActivity items={[]} today={data.today} />)
    expect(screen.getByText('No activity yet.')).toBeInTheDocument()
    expect(screen.getByText('Latest 0')).toBeInTheDocument()
  })

  it('[R42] an entry on nothing has no link, and a stage change without a stage gets a plain dot', () => {
    renderWithProviders(<RecentActivity items={[loose]} today={data.today} />)
    const item = screen.getByTestId('recent-entry')
    expect(within(item).queryByRole('link')).toBeNull()
    expect(item.querySelector('span[aria-hidden]')!.className).toContain('bg-mist')
    expect(within(item).getByText('Mar 2, 2025')).toBeInTheDocument()
  })

  it('[R42] a note on a contact links to the contact with a plain dot', () => {
    renderWithProviders(<RecentActivity items={[data.recent[1]]} today={data.today} />)
    const item = screen.getByTestId('recent-entry')
    expect(within(item).getByRole('link', { name: 'Lena Fischer' })).toHaveAttribute('href', '/contacts/7')
    expect(item.querySelector('span[aria-hidden]')!.className).toContain('bg-mist')
  })
})
