import { screen, within } from '@testing-library/react'
import { mockApi, renderWithProviders } from '@/test/render'
import { DealPage } from './DealPage'

const deal = {
  id: 12, name: 'Fleet pilot', organization_id: 4, organization_name: 'Harbor Freight Lines', contact_id: 9, contact_name: 'Maya Okafor',
  stage: 'negotiation', value: 45000, probability: 70, expected_revenue: 31500, close_date: '2026-12-31', late: false, position: 0,
}
const stages = [{ key: 'negotiation', label: 'Negotiation', probability: 70, open: true }]
const timeline = [
  { id: 2, kind: 'stage_change', description: 'Moved from Proposal to Negotiation', occurred_at: '2026-11-14T09:00:00', follow_up_date: null, done: false, from_stage: 'proposal', to_stage: 'negotiation', contact_id: null, contact_name: null, deal_id: 12, deal_name: 'Fleet pilot' },
]

describe('DealPage', () => {
  it('[R17, R18] shows stage, value, probability, expected revenue and close date, links its organization and contact, and has a timeline', async () => {
    mockApi({ 'GET /deals/12': deal, 'GET /pipeline': { stages }, 'GET /deals/12/timeline': timeline, 'GET /contacts': [], 'GET /deals': [] })
    renderWithProviders(<DealPage />, { path: '/deals/12', route: '/deals/:id' })
    expect(await screen.findByRole('heading', { name: 'Fleet pilot', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Stage: Negotiation')).toBeInTheDocument()
    const figures = screen.getAllByRole('definition')
    const text = figures.map((f) => f.textContent).join(' | ')
    expect(text).toContain('$45,000')
    expect(text).toContain('70%')
    expect(text).toContain('$31,500')
    expect(text).toContain('Dec 31, 2026')
    for (const link of screen.getAllByRole('link', { name: 'Harbor Freight Lines' })) expect(link).toHaveAttribute('href', '/organizations/4')
    for (const link of screen.getAllByRole('link', { name: 'Maya Okafor' })) expect(link).toHaveAttribute('href', '/contacts/9')
    const list = await screen.findByRole('list', { name: 'Timeline' })
    expect(within(list).getByText('Moved from Proposal to Negotiation')).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Log activity' })).toBeInTheDocument()
  })

  it('[R17] a late deal shows the Late label', async () => {
    mockApi({ 'GET /deals/12': { ...deal, late: true, close_date: '2026-11-01' }, 'GET /pipeline': { stages }, 'GET /deals/12/timeline': [] })
    renderWithProviders(<DealPage />, { path: '/deals/12', route: '/deals/:id' })
    expect(await screen.findByText('Late')).toBeInTheDocument()
    expect(await screen.findByText('No activities yet. Log a call, email or note above.')).toBeInTheDocument()
  })
})
