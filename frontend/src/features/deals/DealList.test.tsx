import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import type { Deal } from './api'
import { DealList } from './DealList'

const deal = (id: number, name: string, extra: Partial<Deal> = {}): Deal => ({
  id,
  name,
  organization_id: 4,
  organization_name: 'Harbor Freight Lines',
  contact_id: 9,
  contact_name: 'Maya Okafor',
  stage: 'proposal',
  value: 45000,
  probability: 40,
  expected_revenue: 18000,
  close_date: '2026-12-31',
  late: false,
  position: 0,
  ...extra,
})

function items() {
  return within(screen.getByRole('list', { name: 'Deals' })).getAllByRole('listitem')
}

describe('DealList', () => {
  it('shows the empty message when there are no deals', () => {
    renderWithProviders(<DealList deals={[]} empty="No deals for this contact." />)
    expect(screen.getByText('No deals for this contact.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Deals' })).toBeNull()
  })

  it('[R16, R18] lists each deal, linked to its page, with its main contact, stage, value and close date', () => {
    renderWithProviders(
      <DealList
        deals={[
          deal(1, 'Fleet pilot'),
          deal(2, 'Annual renewal', { contact_id: null, contact_name: null, late: true }),
        ]}
        empty="None"
      />,
    )
    const [first, second] = items()
    expect(within(first).getByRole('link', { name: 'Fleet pilot' })).toHaveAttribute('href', '/deals/1')
    expect(within(first).getByText('Maya Okafor')).toBeInTheDocument()
    expect(within(first).getByText('Proposal')).toBeInTheDocument()
    expect(within(first).getByText('$45,000')).toBeInTheDocument()
    expect(within(first).getByText('Dec 31, 2026')).toBeInTheDocument()
    expect(within(second).getByText('No main contact')).toBeInTheDocument()
    expect(within(second).getByText('Late')).toBeInTheDocument()
    expect(within(second).queryByText('Dec 31, 2026')).toBeNull()
  })

  it('[R15] shows the organization instead of the contact when asked', () => {
    renderWithProviders(
      <DealList
        deals={[deal(1, 'Fleet pilot'), deal(2, 'Annual renewal', { organization_id: null, organization_name: null })]}
        empty="None"
        showOrganization
      />,
    )
    const [first, second] = items()
    expect(within(first).getByText('Harbor Freight Lines')).toBeInTheDocument()
    expect(within(first).queryByText('Maya Okafor')).toBeNull()
    expect(within(second).getByText('No organization')).toBeInTheDocument()
  })
})
