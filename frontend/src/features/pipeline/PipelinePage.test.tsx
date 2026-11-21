import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from '@/components/ui/sonner'
import type { Deal } from '@/features/deals/api'
import { STAGE_KEYS, type StageKey } from '@/features/deals/stages'
import { mockApi, renderWithProviders } from '@/test/render'
import type { Pipeline, PipelineColumn } from './api'
import { expectedRevenue, openTotals } from './board'
import { PipelinePage } from './PipelinePage'

const STAGES: { key: StageKey; label: string; probability: number; open: boolean }[] = [
  { key: 'new', label: 'New', probability: 5, open: true },
  { key: 'qualified', label: 'Qualified', probability: 20, open: true },
  { key: 'proposal', label: 'Proposal', probability: 40, open: true },
  { key: 'negotiation', label: 'Negotiation', probability: 70, open: true },
  { key: 'won', label: 'Won', probability: 100, open: false },
  { key: 'lost', label: 'Lost', probability: 0, open: false },
]

function deal(id: number, stage: StageKey, value: number, extra: Partial<Deal> = {}): Deal {
  const probability = STAGES.find((s) => s.key === stage)!.probability
  return {
    id,
    name: `Deal ${id}`,
    organization_id: null,
    organization_name: null,
    contact_id: null,
    contact_name: null,
    stage,
    value,
    probability,
    expected_revenue: expectedRevenue(value, probability),
    close_date: '2027-03-01',
    late: false,
    position: 0,
    ...extra,
  }
}

function board(dealsByStage: Partial<Record<StageKey, Deal[]>>): Pipeline {
  const columns: PipelineColumn[] = STAGES.map((s) => {
    const deals = (dealsByStage[s.key] ?? []).map((d, i) => ({ ...d, position: i }))
    return {
      stage: s.key,
      label: s.label,
      probability: s.probability,
      open: s.open,
      count: deals.length,
      total: deals.reduce((t, d) => t + d.value, 0),
      expected: deals.reduce((t, d) => t + d.expected_revenue, 0),
      deals,
    }
  })
  return { stages: STAGES, columns, totals: openTotals(columns) }
}

const sample = () =>
  board({
    new: [deal(1, 'new', 10000), deal(2, 'new', 20000)],
    qualified: [deal(3, 'qualified', 30000)],
    won: [deal(4, 'won', 50000)],
  })

function column(label: string) {
  return screen.getByRole('region', { name: `${label} column` })
}

function cardNames(label: string) {
  return within(column(label))
    .queryAllByTestId('deal-card')
    .map((c) => within(c).getByRole('link').textContent)
}

/**
 * jsdom has no layout, so dnd-kit would see every element at 0,0. Lay the board out as a grid:
 * columns 220px apart, cards 80px apart down each column.
 */
function layOutBoard() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    // The drag overlay is fixed at the picked-up card's place, given in its inline style.
    const fixed = this.closest<HTMLElement>('[style*="position: fixed"]')
    if (fixed) {
      const overlay = fixed.style
      const [x, y, w, h] = [overlay.left, overlay.top, overlay.width, overlay.height].map((v) => parseFloat(v) || 0)
      return new DOMRect(x, y, w, h)
    }
    const section = this.closest('section[data-stage]')
    if (!section) return new DOMRect(0, 0, 0, 0)
    const left = STAGE_KEYS.indexOf(section.getAttribute('data-stage') as StageKey) * 220
    // Cards, including the placeholder left where the dragged card was.
    if (this.matches('[data-testid="column-cards"] > div')) {
      const cards = Array.from(section.querySelectorAll('[data-testid="column-cards"] > div'))
      return new DOMRect(left, 100 + cards.indexOf(this) * 80, 200, 74)
    }
    return new DOMRect(left, 100, 200, 600)
  })
}

async function renderBoard(data: Pipeline = sample(), extra: Record<string, unknown> = {}) {
  const api = mockApi({ 'GET /pipeline': data, ...extra })
  const result = renderWithProviders(
    <>
      <PipelinePage />
      <Toaster />
    </>,
  )
  await screen.findByRole('region', { name: 'New column' })
  return { ...api, ...result }
}

function card(name: string) {
  return screen.getByRole('button', { name: new RegExp(`^${name},`) })
}

/** Picks up a card with the keyboard, presses the arrow keys and drops it. */
async function keyboardDrag(name: string, keys: string[]) {
  const target = card(name)
  act(() => target.focus())
  fireEvent.keyDown(target, { code: 'Space', key: ' ' })
  await screen.findByTestId('dragging-card')
  for (const code of keys) {
    fireEvent.keyDown(document.activeElement ?? target, { code, key: code })
    await act(async () => {})
  }
  fireEvent.keyDown(document.activeElement ?? target, { code: 'Space', key: ' ' })
  await act(async () => {})
}

/** Drags a card with the mouse from its middle to the point given, in a few steps. */
async function pointerDrag(name: string, to: { x: number; y: number }) {
  const target = card(name)
  const start = target.getBoundingClientRect()
  const from = { x: start.left + start.width / 2, y: start.top + start.height / 2 }
  const pointer = { isPrimary: true, button: 0, pointerId: 1 }
  fireEvent.pointerDown(target, { ...pointer, clientX: from.x, clientY: from.y })
  for (const t of [0.25, 0.5, 0.75, 1]) {
    fireEvent.pointerMove(document, {
      ...pointer,
      clientX: from.x + (to.x - from.x) * t,
      clientY: from.y + (to.y - from.y) * t,
    })
    await act(async () => {})
  }
  fireEvent.pointerUp(document, { ...pointer, clientX: to.x, clientY: to.y })
  await act(async () => {})
}

describe('PipelinePage', () => {
  it('shows a loading message until the board arrives', () => {
    mockApi({ 'GET /pipeline': () => new Promise(() => {}) })
    renderWithProviders(<PipelinePage />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('says when the board could not be loaded', async () => {
    mockApi({ 'GET /pipeline': new Response(JSON.stringify({ detail: 'boom' }), { status: 500 }) })
    renderWithProviders(<PipelinePage />)
    expect(await screen.findByText("Couldn't load the pipeline.")).toBeInTheDocument()
  })

  it('[R27] shows six columns in order, each with its count, total value and expected revenue', async () => {
    await renderBoard()
    const regions = screen.getAllByRole('region', { name: / column$/ }).map((r) => r.getAttribute('aria-label'))
    expect(regions).toEqual(STAGES.map((s) => `${s.label} column`))

    const newCol = within(column('New'))
    expect(newCol.getByTestId('column-count')).toHaveTextContent('2')
    expect(newCol.getByTestId('column-totals')).toHaveTextContent('$30,000 · $1,500 exp.')
    expect(newCol.getByText('5% likely')).toBeInTheDocument()
    expect(cardNames('New')).toEqual(['Deal 1', 'Deal 2'])

    // Closed columns show the total but no expected revenue.
    const won = within(column('Won'))
    expect(won.getByTestId('column-count')).toHaveTextContent('1')
    expect(won.getByTestId('column-totals')).toHaveTextContent(/^\$50,000$/)
    expect(within(column('Lost')).getByTestId('column-count')).toHaveTextContent('0')
  })

  it('[R28] header totals count open deals only, and the strip shows only stages with value', async () => {
    await renderBoard()
    expect(screen.getByTestId('open-totals')).toHaveTextContent(
      '$60,000 open · $7,500 expected revenue · Won and Lost not counted',
    )
    const strip = screen.getByRole('img', { name: 'Open value by stage' })
    const segments = Array.from(strip.children)
    expect(segments.map((s) => s.getAttribute('data-stage'))).toEqual(['new', 'qualified'])
    expect(segments[0]).toHaveAttribute('title', 'New: $30,000')
  })

  it('[R34] clicking a card opens the deal page', async () => {
    await renderBoard()
    await userEvent.setup().click(card('Deal 3'))
    expect(screen.getByTestId('location')).toHaveTextContent('/deals/3')
  })

  it('[R34] clicking the deal name opens the deal page', async () => {
    await renderBoard()
    await userEvent.setup().click(screen.getByRole('link', { name: 'Deal 2' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/deals/2')
  })

  it("[R33] a column's Add deal button opens the form locked to that stage", async () => {
    const { calls } = await renderBoard(sample(), {
      'GET /organizations': [],
      'GET /contacts': [],
      'POST /deals': (body: unknown) => ({ ...deal(9, 'proposal', 5000), ...(body as object) }),
    })
    const user = userEvent.setup()
    await user.click(within(column('Proposal')).getByRole('button', { name: '+ Add deal' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add deal to Proposal' })
    const stage = within(sheet).getByRole('combobox', { name: 'Stage' })
    expect(stage).toHaveTextContent('Proposal')
    expect(stage).toBeDisabled()

    await user.type(within(sheet).getByLabelText('Name'), 'Harbor pilot')
    await user.type(within(sheet).getByLabelText('Value ($)'), '5000')
    fireEvent.change(within(sheet).getByLabelText('Close date'), { target: { value: '2027-02-01' } })
    await user.click(within(sheet).getByRole('button', { name: 'Add deal' }))

    expect(await screen.findByText('Deal added')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const post = calls.find((c) => c.method === 'POST' && c.path === '/deals')
    expect(post?.body).toMatchObject({ name: 'Harbor pilot', stage: 'proposal', value: 5000 })
  })

  it('the header Add deal button opens an unlocked form that Cancel closes', async () => {
    await renderBoard(sample(), { 'GET /organizations': [], 'GET /contacts': [] })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Add deal' }))
    const sheet = await screen.findByRole('dialog', { name: 'Add deal' })
    expect(within(sheet).getByRole('combobox', { name: 'Stage' })).toBeEnabled()
    await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('[R30] [R31] [R32] [R35] dragging a card to another column moves it and its totals at once', async () => {
    layOutBoard()
    let answer: (r: Response) => void = () => {}
    const { calls } = await renderBoard(sample(), {
      'POST /deals/1/move': () => new Promise<Response>((resolve) => (answer = resolve)),
    })
    await keyboardDrag('Deal 1', ['ArrowRight'])

    await waitFor(() => expect(calls.some((c) => c.path === '/deals/1/move')).toBe(true))
    expect(calls.find((c) => c.path === '/deals/1/move')?.body).toEqual({ stage: 'qualified', index: 0 })
    // The board changed before the server answered.
    expect(cardNames('New')).toEqual(['Deal 2'])
    expect(cardNames('Qualified')).toEqual(['Deal 1', 'Deal 3'])
    expect(within(column('Qualified')).getByTestId('column-totals')).toHaveTextContent('$40,000 · $8,000 exp.')
    expect(screen.getByTestId('open-totals')).toHaveTextContent('$60,000 open · $9,000 expected revenue')
    expect(screen.queryByTestId('dragging-card')).toBeNull()
    answer(new Response(JSON.stringify(deal(1, 'qualified', 10000)), { status: 200 }))
  })

  it('[R30] [R35] dragging a card down its own column reorders it', async () => {
    layOutBoard()
    const { calls } = await renderBoard(sample(), { 'POST /deals/1/move': deal(1, 'new', 10000) })
    await keyboardDrag('Deal 1', ['ArrowDown'])
    await waitFor(() => expect(calls.find((c) => c.path === '/deals/1/move')?.body).toEqual({ stage: 'new', index: 1 }))
  })

  it('[R32] if the server fails, the card goes back and a message says the move was not saved', async () => {
    layOutBoard()
    await renderBoard(sample(), {
      'POST /deals/3/move': new Response(JSON.stringify({ detail: 'nope' }), { status: 500 }),
    })
    await keyboardDrag('Deal 3', ['ArrowLeft'])
    expect(await screen.findByText("The move wasn't saved. The card is back where it was.")).toBeInTheDocument()
    expect(cardNames('Qualified')).toEqual(['Deal 3'])
    expect(cardNames('New')).toEqual(['Deal 1', 'Deal 2'])
  })

  it('dropping a card where it started, or past the last column, saves nothing', async () => {
    layOutBoard()
    const { calls } = await renderBoard()
    await keyboardDrag('Deal 1', ['ArrowLeft'])
    await keyboardDrag('Deal 1', ['ArrowRight', 'ArrowLeft'])
    expect(cardNames('New')).toEqual(['Deal 1', 'Deal 2'])
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('[R35] Escape cancels a drag and puts the card back', async () => {
    layOutBoard()
    const { calls } = await renderBoard()
    const target = card('Deal 2')
    act(() => target.focus())
    fireEvent.keyDown(target, { code: 'Space', key: ' ' })
    await screen.findByTestId('dragging-card')
    fireEvent.keyDown(document.activeElement ?? target, { code: 'ArrowRight', key: 'ArrowRight' })
    await act(async () => {})
    fireEvent.keyDown(document.activeElement ?? target, { code: 'Escape', key: 'Escape' })
    // The card is back in place as a draggable card, not the placeholder.
    await waitFor(() => expect(card('Deal 2')).toBeInTheDocument())
    expect(cardNames('New')).toEqual(['Deal 1', 'Deal 2'])
    expect(cardNames('Qualified')).toEqual(['Deal 3'])
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0)
  })

  it('the Add deal form also closes with Escape', async () => {
    await renderBoard(sample(), { 'GET /organizations': [], 'GET /contacts': [] })
    const user = userEvent.setup()
    await user.click(within(column('Won')).getByRole('button', { name: '+ Add deal' }))
    await screen.findByRole('dialog', { name: 'Add deal to Won' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('[R30] [R35] a card moved right from below the last card of the next column goes to its end', async () => {
    layOutBoard()
    const { calls } = await renderBoard(sample(), { 'POST /deals/2/move': deal(2, 'qualified', 20000) })
    await keyboardDrag('Deal 2', ['ArrowRight'])
    await waitFor(() =>
      expect(calls.find((c) => c.path === '/deals/2/move')?.body).toEqual({ stage: 'qualified', index: 1 }),
    )
  })

  it('[R30] [R31] dragging a card with the mouse into an empty column moves it there', async () => {
    layOutBoard()
    const { calls } = await renderBoard(sample(), { 'POST /deals/3/move': deal(3, 'negotiation', 30000) })
    await pointerDrag('Deal 3', { x: 760, y: 420 })
    await waitFor(() =>
      expect(calls.find((c) => c.path === '/deals/3/move')?.body).toEqual({ stage: 'negotiation', index: 0 }),
    )
  })

  it('[R30] dragging a card with the mouse below the last card of a column puts it at the end', async () => {
    layOutBoard()
    const { calls } = await renderBoard(sample(), { 'POST /deals/3/move': deal(3, 'new', 30000) })
    // Deal 2, the last card in New, sits at y 180 to 254; drop the card below its middle.
    await pointerDrag('Deal 3', { x: 100, y: 267 })
    await waitFor(() => expect(calls.find((c) => c.path === '/deals/3/move')?.body).toEqual({ stage: 'new', index: 2 }))
  })

  it('[R30] dragging a card with the mouse up its own column reorders it', async () => {
    layOutBoard()
    const { calls } = await renderBoard(sample(), { 'POST /deals/2/move': deal(2, 'new', 20000) })
    await pointerDrag('Deal 2', { x: 100, y: 120 })
    await waitFor(() => expect(calls.find((c) => c.path === '/deals/2/move')?.body).toEqual({ stage: 'new', index: 0 }))
  })
})
