import { screen, waitFor } from '@testing-library/react'

vi.mock('@/app/App', () => ({ App: () => <p>App stand-in</p> }))

describe('main', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('mounts the app into #root', async () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
    await import('./main')
    await waitFor(() => expect(screen.getByText('App stand-in')).toBeInTheDocument())
    expect(root).toContainElement(screen.getByText('App stand-in'))
  })
})
