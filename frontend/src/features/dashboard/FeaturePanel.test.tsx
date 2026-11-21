import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import type { Dashboard } from './api'
import { data } from './DashboardPage.test.data'
import { FeaturePanel } from './FeaturePanel'

function renderPanel(change: Partial<Dashboard> = {}, summary: Partial<Dashboard['summary']> = {}) {
  renderWithProviders(<FeaturePanel data={{ ...data, ...change, summary: { ...data.summary, ...summary } }} />)
}

describe('FeaturePanel', () => {
  it('[R36] shows overdue follow-ups in the alert color only when some are overdue', () => {
    renderPanel()
    expect(screen.getByTestId('follow-ups-overdue').className).toContain('text-raspberry-on-dark')
  })

  it('[R36] nothing overdue is shown in plain white', () => {
    renderPanel({}, { overdue_follow_ups: 0 })
    const overdue = screen.getByTestId('follow-ups-overdue')
    expect(overdue).toHaveTextContent('0 of 7')
    expect(overdue.className).toContain('text-white')
    expect(overdue.className).not.toContain('text-raspberry-on-dark')
  })

  it('[R36] with no closed deals the win rate is a dash', () => {
    renderPanel({}, { win_rate: null })
    expect(screen.getByTestId('win-rate')).toHaveTextContent('—')
  })

  it('[R39] a stage with no open value has no segment in the strip but still has its column', () => {
    renderPanel({
      strip: data.strip.map((s) => (s.stage === 'qualified' ? { ...s, count: 0, value: 0, expected: 0 } : s)),
    })
    const strip = screen.getByTestId('pipeline-strip')
    expect([...strip.querySelectorAll('[data-stage]')].map((el) => el.getAttribute('data-stage'))).toEqual([
      'new',
      'proposal',
      'negotiation',
    ])
    expect(screen.getAllByTestId('strip-stage')[1]).toHaveTextContent('Qualified0$0$0 expected')
  })

  it('[R39] each segment is as wide as its value and named in its title', () => {
    renderPanel()
    const segment = screen.getByTestId('pipeline-strip').querySelector('[data-stage="proposal"]') as HTMLElement
    expect(segment.style.flexGrow).toBe('268500')
    expect(segment).toHaveAttribute('title', 'Proposal: $268,500')
  })
})
