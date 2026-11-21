import { isStageKey, type StageKey } from '@/features/deals/stages'
import type { Pipeline, PipelineColumn } from './api'

/** Whole-dollar expected revenue, matching the backend's rounding (halves up). */
export function expectedRevenue(value: number, probability: number) {
  return Math.floor((value * probability + 50) / 100)
}

function withTotals(column: PipelineColumn): PipelineColumn {
  return {
    ...column,
    count: column.deals.length,
    total: column.deals.reduce((s, d) => s + d.value, 0),
    expected: column.deals.reduce((s, d) => s + d.expected_revenue, 0),
  }
}

export function openTotals(columns: PipelineColumn[]) {
  const open = columns.filter((c) => c.open)
  return {
    open_count: open.reduce((s, c) => s + c.count, 0),
    open_value: open.reduce((s, c) => s + c.total, 0),
    open_expected: open.reduce((s, c) => s + c.expected, 0),
  }
}

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * The board after moving a card to `index` in `stage`: the same rules the server applies, so the
 * optimistic board matches what comes back. Another column means the stage's probability, and Won
 * or Lost sets the close date to today. Returns a new object; the input isn't changed.
 */
export function moveCard(
  board: Pipeline,
  dealId: number,
  stage: StageKey,
  index: number,
  today = localToday(),
): Pipeline {
  if (!isStageKey(stage)) throw new Error(`Unknown stage: ${stage}`)
  const from = board.columns.find((c) => c.deals.some((d) => d.id === dealId))
  if (!from) return board
  const deal = from.deals.find((d) => d.id === dealId)!
  const target = board.columns.find((c) => c.stage === stage)!
  let moved = deal
  if (from.stage !== stage) {
    const probability = target.probability
    moved = {
      ...deal,
      stage,
      probability,
      expected_revenue: expectedRevenue(deal.value, probability),
      close_date: target.open ? deal.close_date : today,
    }
    moved.late = target.open && moved.close_date < today
  }
  const columns = board.columns.map((c) => {
    let deals = c.deals.filter((d) => d.id !== dealId)
    if (c.stage === stage) {
      deals = [...deals]
      deals.splice(Math.min(index, deals.length), 0, moved)
    }
    if (c.stage !== stage && c.stage !== from.stage) return c
    return withTotals({ ...c, deals: deals.map((d, i) => ({ ...d, position: i })) })
  })
  return { ...board, columns, totals: openTotals(columns) }
}

/** The four open stages' share of the open value, for the strip. */
export function stripSegments(columns: PipelineColumn[]) {
  return columns
    .filter((c) => c.open)
    .map((c) => ({ stage: c.stage, label: c.label, value: c.total, count: c.count, expected: c.expected }))
}
