import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router'
import type { Deal } from '@/features/deals/api'
import { stageStyle } from '@/features/deals/stages'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PipelineColumn } from './api'
import { Card } from './Card'

function SortableCard({ deal }: { deal: Deal }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { stage: deal.stage },
  })
  const style = { transform: CSS.Translate.toString(transform), transition }
  if (isDragging) return <Card ref={setNodeRef} style={style} deal={deal} placeholder />
  return (
    <Card
      ref={setNodeRef}
      style={style}
      deal={deal}
      {...attributes}
      {...listeners}
      aria-label={`${deal.name}, ${money(deal.value)}`}
      aria-roledescription="deal card"
      onClick={() => navigate(`/deals/${deal.id}`)}
    />
  )
}

export function Column({ column, deals, onAdd }: { column: PipelineColumn; deals: Deal[]; onAdd: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${column.stage}`, data: { stage: column.stage } })
  const style = stageStyle(column.stage)
  return (
    <section
      aria-label={`${column.label} column`}
      data-stage={column.stage}
      className={cn(
        'flex min-h-[720px] min-w-[200px] flex-col rounded-lg bg-panel p-2.5 shadow-panel transition-colors',
        isOver && 'bg-hover',
      )}
    >
      <header className={cn('mb-2.5 rounded-md px-3 py-2.5', style.fill)} data-testid="column-header">
        <div className="flex items-center justify-between font-semibold">
          <h2>{column.label}</h2>
          <span
            data-testid="column-count"
            className={cn(
              'rounded-full px-2 py-px font-mono text-xs font-semibold',
              style.lightText ? 'bg-count-pill-dark' : 'bg-count-pill-light',
            )}
          >
            {column.count}
          </span>
        </div>
        <div className="mt-1 font-mono text-xs opacity-90" data-testid="column-totals">
          {money(column.total)}
          {column.open ? ` · ${money(column.expected)} exp.` : ''}
        </div>
        <div className="font-mono text-xs opacity-90">{column.probability}% likely</div>
      </header>
      <SortableContext id={column.stage} items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex flex-1 flex-col" data-testid="column-cards">
          {deals.map((d) => (
            <SortableCard key={d.id} deal={d} />
          ))}
          <button
            type="button"
            onClick={onAdd}
            className="mt-0.5 rounded-md bg-page py-2 text-center text-[13px] font-medium text-ink-muted transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            + Add deal
          </button>
        </div>
      </SortableContext>
    </section>
  )
}
