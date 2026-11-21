import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { DataTable, type Column } from './DataTable'

type Row = { id: number; name: string; email: string; title: string; value: number }

const data: Row[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  name: `Person ${String(i).padStart(4, '0')} ${['Lane', 'Okafor', 'Petrov', 'Reyes'][i % 4]}`,
  email: `p${i}@example.com`,
  title: ['IT Manager', 'Owner', 'CFO'][i % 3],
  value: (i * 7919) % 150000,
}))

const columns: Column<Row>[] = [
  { id: 'name', header: 'Name', value: (r) => r.name },
  { id: 'email', header: 'Email', value: (r) => r.email },
  { id: 'title', header: 'Job title', value: (r) => r.title },
  { id: 'value', header: 'Value', value: (r) => r.value, numeric: true },
]

// Generous, so slow machines don't give false failures.
const LIMIT_MS = 200
// Each step is timed a few times and the fastest counts. The rest of the suite
// runs in parallel and only ever adds time, so one busy moment shouldn't fail
// the test, while a table that is really slow is slow every time.
const RUNS = 3

function fastest(step: () => void, reset: () => void = () => {}) {
  let best = Infinity
  for (let i = 0; i < RUNS; i++) {
    reset()
    const start = performance.now()
    step()
    best = Math.min(best, performance.now() - start)
  }
  return best
}

describe('DataTable at scale', () => {
  it('[R14] renders 1,000 rows, and a search and a sort each finish within 200 ms', () => {
    renderWithProviders(
      <DataTable data={data} columns={columns} noun="contacts" rowHref={(r) => `/contacts/${r.id}`} />,
    )
    expect(screen.getAllByRole('row')).toHaveLength(1001)

    const searchbox = screen.getByRole('searchbox')
    const search = (value: string) => fireEvent.change(searchbox, { target: { value } })
    const searchMs = fastest(
      () => search('okafor'),
      () => search(''),
    )
    expect(screen.getAllByRole('row')).toHaveLength(251)

    search('')
    // Each click flips the sort between ascending and descending, so each one re-sorts all 1,000 rows.
    const valueHeader = screen.getByRole('button', { name: 'Value' })
    const sortMs = fastest(() => fireEvent.click(valueHeader))
    expect(screen.getAllByRole('row')).toHaveLength(1001)

    expect(searchMs).toBeLessThan(LIMIT_MS)
    expect(sortMs).toBeLessThan(LIMIT_MS)
  })
})
