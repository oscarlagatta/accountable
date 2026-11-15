import { screen } from '@testing-library/react'
import type { Deal } from '@/features/deals/api'
import { renderWithProviders } from '@/test/render'
import { Card } from './Card'

const deal: Deal = {
  id: 7, name: 'Fleet tracking pilot', organization_id: 1, organization_name: 'Harbor Freight Lines', contact_id: 2, contact_name: 'Maya Okafor',
  stage: 'new', value: 24000, probability: 5, expected_revenue: 1200, close_date: '2027-01-30', late: false, position: 0,
}

describe('Card', () => {
  it('[R29] shows the deal name, organization, main contact, value and close date', () => {
    renderWithProviders(<Card deal={deal} />)
    expect(screen.getByRole('link', { name: 'Fleet tracking pilot' })).toHaveAttribute('href', '/deals/7')
    expect(screen.getByText('Harbor Freight Lines · Maya Okafor')).toBeInTheDocument()
    expect(screen.getByText('$24,000')).toBeInTheDocument()
    expect(screen.getByText('Jan 30')).toBeInTheDocument()
    expect(screen.queryByText('Late')).toBeNull()
  })

  it('[R29] a late card shows "Late" in place of the date', () => {
    renderWithProviders(<Card deal={{ ...deal, late: true, close_date: '2026-11-01' }} />)
    expect(screen.getByText('Late')).toBeInTheDocument()
    expect(screen.queryByText('Nov 1')).toBeNull()
  })

  it('[R29] leaves out missing organization and contact', () => {
    renderWithProviders(<Card deal={{ ...deal, organization_name: null, contact_name: null }} />)
    expect(screen.queryByText(/·/)).toBeNull()
  })
})
