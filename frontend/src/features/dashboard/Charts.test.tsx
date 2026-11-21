import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { giveChartsASize } from '@/test/dashboardChartLayout'
import type { Month } from './api'
import { FunnelChart, RevenueChart, WonLostChart } from './Charts'
import { data } from './DashboardPage.test.data'

async function hover(testId: string, x: number) {
  const chart = screen.getByTestId(testId)
  await waitFor(() => expect(chart.querySelector('.recharts-wrapper')).not.toBeNull())
  const wrapper = chart.querySelector('.recharts-wrapper')!
  fireEvent.mouseMove(wrapper, { clientX: x, clientY: 100 })
  await waitFor(() => expect(chart.querySelector('.recharts-tooltip-wrapper')?.textContent).toBeTruthy())
  return chart.querySelector('.recharts-tooltip-wrapper')!.textContent
}

describe('Charts', () => {
  beforeEach(() => giveChartsASize())

  it('[R37] marks the best month with its value, and labels every other month', async () => {
    render(<RevenueChart months={data.months} />)
    const chart = screen.getByTestId('revenue-chart')
    await waitFor(() => expect(chart.querySelector('.recharts-reference-dot')).not.toBeNull())
    expect(chart.textContent).toContain('$120K')
    // Month labels come first in the drawing, then the value axis.
    expect(chart.querySelector('svg')!.textContent).toMatch(/^DecFebAprJunAugOct\$0/)
  })

  it('[R37] has no peak marker when nothing was won', async () => {
    const months: Month[] = data.months.map((m) => ({ ...m, won_value: 0 }))
    render(<RevenueChart months={months} />)
    const chart = screen.getByTestId('revenue-chart')
    await waitFor(() => expect(chart.querySelector('.recharts-area-curve')).not.toBeNull())
    expect(chart.querySelector('.recharts-reference-dot')).toBeNull()
  })

  it('[R37] renders with no months at all', () => {
    render(<RevenueChart months={[]} />)
    expect(screen.getByTestId('revenue-chart')).toBeInTheDocument()
    expect(screen.getByTestId('revenue-chart').querySelector('.recharts-reference-dot')).toBeNull()
  })

  it('[R37] the tooltip shows the revenue won in dollars', async () => {
    render(<RevenueChart months={data.months} />)
    const text = await hover('revenue-chart', 380)
    expect(text).toContain('$120,000')
  })

  it('[R38] the tooltip shows the counts won and lost', async () => {
    render(<WonLostChart months={data.months} />)
    const text = await hover('won-lost-chart', 40)
    // December 2025: one won, one lost.
    expect(text).toMatch(/Won1Lost1$/)
  })

  it('[R40] the funnel tooltip names the stage, its value and deal count', async () => {
    render(<FunnelChart funnel={data.funnel} />)
    const text = await hover('funnel-chart', 40)
    expect(text).toContain('New')
    expect(text).toContain('$2,840,000 · 60 deals')
  })

  it('[R40] the funnel shows the carried-on share under every stage but New', async () => {
    render(<FunnelChart funnel={data.funnel} />)
    const chart = screen.getByTestId('funnel-chart')
    await waitFor(() => expect(chart.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(5))
    expect(chart.querySelector('svg')!.textContent).toContain('NewQualified71%Proposal74%Negotiation89%Won93%')
  })
})
