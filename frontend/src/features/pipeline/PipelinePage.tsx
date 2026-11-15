import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Page, PageHeader } from '@/components/PageHeader'
import { RecordSheet } from '@/components/RecordSheet'
import { Button } from '@/components/ui/button'
import type { Deal } from '@/features/deals/api'
import { DealForm } from '@/features/deals/DealForm'
import { STAGE_KEYS, stageStyle, type StageKey } from '@/features/deals/stages'
import { money } from '@/lib/format'
import { usePipeline, useMoveDeal } from './api'
import { stripSegments } from './board'
import { Card } from './Card'
import { Column } from './Column'

type Layout = Record<StageKey, number[]>

/** Which column a drag target (a card id or a column id) belongs to. */
function containerOf(layout: Layout, id: string | number): StageKey | undefined {
  if (typeof id === 'string' && id.startsWith('column:')) return id.slice(7) as StageKey
  return (Object.keys(layout) as StageKey[]).find((k) => layout[k].includes(Number(id)))
}

/**
 * Keyboard dragging. Up and Down use dnd-kit's sortable behaviour. Left and Right go to the
 * neighbouring column, at the same place in the list (or its end). dnd-kit's own Left/Right picks
 * by left edges, and the tilted card's box sits a little left of the others, so it would first land
 * on a card in its own column.
 */
function columnKeyboardCoordinates(layoutRef: { current: Layout }): KeyboardCoordinateGetter {
  return (event, args) => {
    if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return sortableKeyboardCoordinates(event, args)
    event.preventDefault()
    const { active, over, droppableRects } = args.context
    if (!active) return undefined
    const layout = layoutRef.current
    const from = containerOf(layout, over?.id ?? active.id) ?? containerOf(layout, active.id)
    if (!from) return undefined
    const next = STAGE_KEYS[STAGE_KEYS.indexOf(from) + (event.code === 'ArrowRight' ? 1 : -1)]
    if (!next) return undefined
    const index = Math.max(0, layout[from].indexOf(Number(active.id)))
    const target = layout[next].filter((id) => id !== Number(active.id))
    const rect = target.length ? droppableRects.get(target[Math.min(index, target.length - 1)]) : droppableRects.get(`column:${next}`)
    return rect ? { x: rect.left, y: rect.top + (index >= target.length && target.length ? rect.height : 0) } : undefined
  }
}

export function PipelinePage() {
  const pipeline = usePipeline()
  const move = useMoveDeal()
  const [adding, setAdding] = useState<{ stage: StageKey; lock: boolean } | null>(null)
  // While a card is being dragged, the board shows a working layout; otherwise the server's.
  const [dragLayout, setDragLayout] = useState<Layout | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)

  const layoutRef = useRef<Layout>({} as Layout)
  const [keyboardCoordinates] = useState(() => columnKeyboardCoordinates(layoutRef))
  const sensors = useSensors(
    // A small distance before a drag starts, so a click still opens the deal.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  )

  const data = pipeline.data
  const dealsById = useMemo(() => new Map<number, Deal>((data?.columns ?? []).flatMap((c) => c.deals.map((d) => [d.id, d] as const))), [data])
  const serverLayout = useMemo(
    () => Object.fromEntries((data?.columns ?? []).map((c) => [c.stage, c.deals.map((d) => d.id)])) as Layout,
    [data],
  )
  const layout = dragLayout ?? serverLayout
  layoutRef.current = layout

  function onDragStart(e: DragStartEvent) {
    setActiveId(Number(e.active.id))
    setDragLayout(serverLayout)
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over || !dragLayout) return
    const from = containerOf(dragLayout, active.id)
    const to = containerOf(dragLayout, over.id)
    if (!from || !to || from === to) return
    // Moving into another column: put the card where the pointer is.
    setDragLayout((prev) => {
      if (!prev) return prev
      const id = Number(active.id)
      const target = prev[to].filter((x) => x !== id)
      const overIndex = typeof over.id === 'number' ? target.indexOf(Number(over.id)) : -1
      const below = over.rect && active.rect.current.translated ? active.rect.current.translated.top > over.rect.top + over.rect.height / 2 : false
      const index = overIndex === -1 ? target.length : overIndex + (below ? 1 : 0)
      target.splice(index, 0, id)
      return { ...prev, [from]: prev[from].filter((x) => x !== id), [to]: target }
    })
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    const id = Number(active.id)
    const current = dragLayout
    setActiveId(null)
    setDragLayout(null)
    if (!over || !current) return
    const to = containerOf(current, over.id)
    if (!to) return
    let column = current[to]
    if (typeof over.id === 'number' && over.id !== id && column.includes(over.id)) {
      column = arrayMove(column, column.indexOf(id), column.indexOf(over.id))
    }
    const index = column.indexOf(id)
    const original = dealsById.get(id)
    if (!original) return
    const originalIndex = serverLayout[original.stage].indexOf(id)
    if (original.stage === to && originalIndex === index) return
    move.move({ dealId: id, stage: to, index })
  }

  function onDragCancel() {
    setActiveId(null)
    setDragLayout(null)
  }

  if (!data) {
    return (
      <Page>
        <PageHeader title="Pipeline" subtitle={pipeline.isError ? "Couldn't load the pipeline." : 'Loading…'} />
      </Page>
    )
  }

  const segments = stripSegments(data.columns)
  const totals = data.totals
  const active = activeId !== null ? dealsById.get(activeId) : undefined

  return (
    <Page>
      <PageHeader
        title="Pipeline"
        subtitle={
          <span data-testid="open-totals">
            {money(totals.open_value)} open · {money(totals.open_expected)} expected revenue · Won and Lost not counted
          </span>
        }
        actions={
          <Button onClick={() => setAdding({ stage: 'new', lock: false })}>Add deal</Button>
        }
      />
      <div className="mb-[18px] flex h-2.5 gap-[3px]" role="img" aria-label="Open value by stage" data-testid="summary-strip">
        {segments.map((s) =>
          s.value > 0 ? (
            <div key={s.stage} data-stage={s.stage} title={`${s.label}: ${money(s.value)}`} className={`rounded-[3px] ${stageStyle(s.stage).bg}`} style={{ flexGrow: s.value }} />
          ) : null,
        )}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1240px] grid-cols-6 items-start gap-3">
            {data.columns.map((c) => (
              <Column
                key={c.stage}
                column={c}
                deals={(layout[c.stage] ?? []).map((id) => dealsById.get(id)!).filter(Boolean)}
                onAdd={() => setAdding({ stage: c.stage, lock: true })}
              />
            ))}
          </div>
        </div>
        <DragOverlay>{active ? <Card deal={active} lifted data-testid="dragging-card" /> : null}</DragOverlay>
      </DndContext>
      <RecordSheet open={adding !== null} onOpenChange={(o) => !o && setAdding(null)} title={adding?.lock ? `Add deal to ${data.columns.find((c) => c.stage === adding.stage)?.label}` : 'Add deal'}>
        {adding ? (
          <DealForm
            defaults={{ stage: adding.stage }}
            lockStage={adding.lock}
            onCancel={() => setAdding(null)}
            onSaved={() => {
              toast.success('Deal added')
              setAdding(null)
            }}
          />
        ) : null}
      </RecordSheet>
    </Page>
  )
}
