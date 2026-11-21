import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { data } from '@/features/dashboard/DashboardPage.test.data'
import { mockApi } from '@/test/render'
import { App } from './App'
import { queryClient } from './queryClient'

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('App', () => {
  afterEach(() => {
    queryClient.clear()
    window.history.pushState({}, '', '/')
  })

  it('[R44] opens on the dashboard with the top bar', async () => {
    mockApi({ 'GET /dashboard': data })
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByTestId('open-value')).toHaveTextContent('$806,000')
  })

  it('[R44] the top bar moves between sections', async () => {
    mockApi({ 'GET /dashboard': data, 'GET /deals': [], 'GET /pipeline': { stages: [] } })
    renderAt('/')
    await screen.findByTestId('open-value')
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    await userEvent.click(within(nav).getByRole('link', { name: 'Deals' }))
    expect(window.location.pathname).toBe('/deals')
    expect(within(nav).getByRole('link', { name: 'Deals' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByTestId('open-value')).toBeNull()
  })

  it('shows a not-found page for an unknown address, with a way back', async () => {
    mockApi({ 'GET /dashboard': data })
    renderAt('/nowhere')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Back to the dashboard' }))
    expect(window.location.pathname).toBe('/')
    expect(await screen.findByTestId('open-value')).toBeInTheDocument()
  })
})
