import { QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { Deal } from '@/features/deals/api'
import { mockApi } from '@/test/render'
import { pipelineKey, useMoveDeal, type Pipeline } from './api'
import { moveCard, stripSegments } from './board'

const STAGES = [
  { key: 'new', label: 'New', probability: 5, open: true },
  { key: 'qualified', label: 'Qualified', probability: 20, open: true },
  { key: 'proposal', label: 'Proposal', probability: 40, open: true },
  { key: 'negotiation', label: 'Negotiation', probability: 70, open: true },
  { key: 'won', label: 'Won', probability: 100, open: false },
  { key: 'lost', label: 'Lost', probability: 0, open: false },
] as const

function deal(id: number, stage: Deal['stage'], value: number, probability: number): Deal {
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
    expected_revenue: Math.floor((value * probability + 50) / 100),
    close_date: '2027-01-31',
    late: false,
    position: 0,
  }
}

function board(): Pipeline {
  const byStage: Record<string, Deal[]> = {
    new: [deal(1, 'new', 10000, 5), deal(2, 'new', 20000, 5)],
    qualified: [deal(3, 'qualified', 30000, 20)],
    proposal: [],
    negotiation: [deal(4, 'negotiation', 40000, 80)],
    won: [deal(5, 'won', 50000, 100)],
    lost: [deal(6, 'lost', 7000, 0)],
  }
  const columns = STAGES.map((s) => {
    const deals = byStage[s.key].map((d, i) => ({ ...d, position: i }))
    return {
      stage: s.key,
      label: s.label,
      probability: s.probability,
      open: s.open,
      deals,
      count: deals.length,
      total: deals.reduce((t, d) => t + d.value, 0),
      expected: deals.reduce((t, d) => t + d.expected_revenue, 0),
    }
  })
  const open = columns.filter((c) => c.open)
  return {
    stages: STAGES.map((s) => ({ ...s })),
    columns,
    totals: {
      open_count: open.reduce((t, c) => t + c.count, 0),
      open_value: open.reduce((t, c) => t + c.total, 0),
      open_expected: open.reduce((t, c) => t + c.expected, 0),
    },
  }
}

const col = (b: Pipeline, stage: string) => b.columns.find((c) => c.stage === stage)!

describe('moving a card on the board', () => {
  it('[R27, R32] a move to another column updates both columns, the probability and the open totals at once', () => {
    const before = board()
    expect(before.totals).toEqual({ open_count: 4, open_value: 100000, open_expected: 500 + 1000 + 6000 + 32000 })
    const after = moveCard(before, 1, 'proposal', 0, '2026-11-15')
    expect(col(after, 'new')).toMatchObject({ count: 1, total: 20000, expected: 1000 })
    expect(col(after, 'proposal')).toMatchObject({ count: 1, total: 10000, expected: 4000 })
    expect(col(after, 'proposal').deals[0]).toMatchObject({ id: 1, stage: 'proposal', probability: 40 })
    expect(after.totals).toEqual({ open_count: 4, open_value: 100000, open_expected: 1000 + 6000 + 4000 + 32000 })
    expect(stripSegments(after.columns).map((s) => s.value)).toEqual([20000, 30000, 10000, 40000])
    // The input is left alone, so it can be put back.
    expect(col(before, 'new').count).toBe(2)
  })

  it('[R28] Won and Lost are left out of the open totals, and moving there sets today as the close date', () => {
    const after = moveCard(board(), 4, 'won', 0, '2026-11-15')
    expect(after.totals).toEqual({ open_count: 3, open_value: 60000, open_expected: 7500 })
    expect(col(after, 'won')).toMatchObject({ count: 2, total: 90000, expected: 90000 })
    expect(col(after, 'won').deals[0]).toMatchObject({ id: 4, probability: 100, close_date: '2026-11-15', late: false })
    const lost = moveCard(after, 3, 'lost', 1, '2026-11-15')
    expect(lost.totals.open_value).toBe(30000)
    expect(col(lost, 'lost').deals.map((d) => d.id)).toEqual([6, 3])
  })

  it('[R27] a move within a column changes only the order', () => {
    const after = moveCard(board(), 1, 'new', 1)
    expect(col(after, 'new').deals.map((d) => [d.id, d.position])).toEqual([
      [2, 0],
      [1, 1],
    ])
    expect(col(after, 'new').deals[1].probability).toBe(5)
    expect(after.totals).toEqual(board().totals)
  })

  it('[R32] rolls the board back and says so when the server fails', async () => {
    mockApi({
      'POST /deals/1/move': () =>
        new Promise((r) =>
          setTimeout(() => r(new Response(JSON.stringify({ detail: 'Database is locked' }), { status: 500 })), 150),
        ),
      'GET /pipeline': board(),
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(pipelineKey, board())
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
    const { result } = renderHook(() => useMoveDeal(), { wrapper })

    act(() => result.current.move({ dealId: 1, stage: 'proposal', index: 0 }))
    await waitFor(() => expect(col(client.getQueryData<Pipeline>(pipelineKey)!, 'proposal').count).toBe(1))
    await waitFor(() => expect(result.current.isError).toBe(true))
    const back = client.getQueryData<Pipeline>(pipelineKey)!
    expect(col(back, 'proposal').count).toBe(0)
    expect(col(back, 'new').deals.map((d) => d.id)).toEqual([1, 2])
    expect(back.totals).toEqual(board().totals)
  })

  it('[R31] a deal moved back to an open column keeps its close date and is late if that date has passed', () => {
    const after = moveCard(board(), 5, 'negotiation', 0, '2027-02-15')
    expect(col(after, 'negotiation').deals[0]).toMatchObject({ id: 5, close_date: '2027-01-31', late: true })
    const onTime = moveCard(board(), 5, 'negotiation', 0, '2027-01-15')
    expect(col(onTime, 'negotiation').deals[0].late).toBe(false)
  })

  it('an index past the end of the column puts the card last', () => {
    const after = moveCard(board(), 3, 'new', 99)
    expect(col(after, 'new').deals.map((d) => d.id)).toEqual([1, 2, 3])
  })

  it('leaves the board alone for a deal that is not on it, and refuses an unknown stage', () => {
    const before = board()
    expect(moveCard(before, 404, 'won', 0)).toBe(before)
    expect(() => moveCard(before, 1, 'archived' as Deal['stage'], 0)).toThrow('Unknown stage: archived')
  })

  it('[R32] still saves the move when the board is not loaded yet, and leaves the cache empty on failure', async () => {
    const { calls } = mockApi({
      'POST /deals/1/move': new Response(JSON.stringify({ detail: 'Database is locked' }), { status: 500 }),
      'GET /pipeline': board(),
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
    const { result } = renderHook(() => useMoveDeal(), { wrapper })

    act(() => result.current.move({ dealId: 1, stage: 'proposal', index: 0 }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(calls.find((c) => c.method === 'POST')).toMatchObject({
      path: '/deals/1/move',
      body: { stage: 'proposal', index: 0 },
    })
    expect(client.getQueryData(pipelineKey)).toBeUndefined()
  })
})
