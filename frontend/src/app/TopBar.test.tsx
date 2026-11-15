import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { TopBar } from './TopBar'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TopBar />
    </MemoryRouter>,
  )
}

describe('TopBar', () => {
  it('[R44] links all five sections', () => {
    renderAt('/')
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['Dashboard', 'Organizations', 'Contacts', 'Deals', 'Pipeline'])
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/', '/organizations', '/contacts', '/deals', '/pipeline'])
  })

  it('[R44] marks the current section, including on record pages', () => {
    renderAt('/contacts/12')
    const nav = screen.getByRole('navigation', { name: 'Sections' })
    expect(within(nav).getByRole('link', { name: 'Contacts' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('[K13] has no search box', () => {
    renderAt('/')
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
