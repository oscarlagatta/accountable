import { ArrowRight, Mail, Pencil, Phone, StickyNote, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { stageStyle } from '@/features/deals/stages'
import { dateShort, dateTime, todayIso } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ActivityForm } from './ActivityForm'
import { useDeleteActivity, useTimeline, useUpdateActivity, type TimelineEntry, type TimelineOwner } from './api'

const ICONS = { note: StickyNote, call: Phone, email: Mail } as const
const KIND_LABEL = { note: 'Note', call: 'Call', email: 'Email', stage_change: 'Stage change' } as const

export function followUpStatus(date: string, today: string): 'overdue' | 'today' | 'upcoming' {
  return date < today ? 'overdue' : date === today ? 'today' : 'upcoming'
}

export function FollowUpChip({ date, today, done = false }: { date: string; today: string; done?: boolean }) {
  if (done)
    return (
      <span className="rounded-full bg-page px-2 py-0.5 font-mono text-xs whitespace-nowrap text-ink-muted line-through">
        {dateShort(date)}
      </span>
    )
  const status = followUpStatus(date, today)
  return (
    <span
      data-status={status}
      className={cn(
        'rounded-full px-2 py-0.5 font-mono text-xs font-medium whitespace-nowrap',
        status === 'overdue' && 'bg-raspberry text-white',
        status === 'today' && 'bg-marigold text-ink',
        status === 'upcoming' && 'bg-page text-ink',
      )}
    >
      {status === 'overdue' ? `Overdue · ${dateShort(date)}` : status === 'today' ? 'Today' : dateShort(date)}
    </span>
  )
}

function KindIcon({ entry }: { entry: TimelineEntry }) {
  if (entry.kind === 'stage_change') {
    const to = entry.to_stage ?? 'new'
    return (
      <span
        role="img"
        aria-label={KIND_LABEL.stage_change}
        data-kind="stage_change"
        className={cn('grid size-7 shrink-0 place-items-center rounded-full', stageStyle(to).fill)}
      >
        <ArrowRight className="size-3.5" aria-hidden />
      </span>
    )
  }
  const Icon = ICONS[entry.kind]
  return (
    <span
      role="img"
      aria-label={KIND_LABEL[entry.kind]}
      data-kind={entry.kind}
      className="grid size-7 shrink-0 place-items-center rounded-full bg-page text-ink"
    >
      <Icon className="size-3.5" aria-hidden />
    </span>
  )
}

function Entry({ entry, owner, today }: { entry: TimelineEntry; owner: TimelineOwner; today: string }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const update = useUpdateActivity()
  const remove = useDeleteActivity()
  const locked = entry.kind === 'stage_change'

  async function markDone() {
    try {
      await update.mutateAsync({ id: entry.id, data: { done: true } })
      toast.success('Follow-up marked done')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not mark it done')
    }
  }

  if (editing) {
    return (
      <li className="rounded-md bg-page p-3">
        <ActivityForm activity={entry} compact onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </li>
    )
  }

  return (
    <li className="group flex gap-3 py-3" data-testid="timeline-entry">
      <KindIcon entry={entry} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium break-words">{entry.description}</p>
          <span className="shrink-0 font-mono text-xs text-ink-muted">{dateTime(entry.occurred_at)}</span>
        </div>
        {owner.kind === 'contact' && entry.deal_id ? (
          <Link to={`/deals/${entry.deal_id}`} className="text-[13px] text-cerulean-ink hover:underline">
            {entry.deal_name}
          </Link>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {entry.follow_up_date ? (
            <>
              <span className="text-xs text-ink-muted">{entry.done ? 'Follow-up done' : 'Follow up'}</span>
              <FollowUpChip date={entry.follow_up_date} today={today} done={entry.done} />
              {!entry.done ? (
                <Button variant="secondary" size="xs" onClick={markDone} disabled={update.isPending}>
                  Mark done
                </Button>
              ) : null}
            </>
          ) : null}
          {!locked ? (
            <div className="ml-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Button variant="ghost" size="icon-xs" aria-label="Edit activity" onClick={() => setEditing(true)}>
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Delete activity"
                className="hover:bg-raspberry/10 hover:text-raspberry-ink"
                onClick={() => setDeleting(true)}
              >
                <Trash2 />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {!locked ? (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          previewKey={['activities', entry.id]}
          loadPreview={async () => ({ name: 'this activity' })}
          consequences={() => [entry.description]}
          onConfirm={async () => {
            await remove.mutateAsync(entry.id)
            toast.success('Activity deleted')
          }}
        />
      ) : null}
    </li>
  )
}

/** A vertical list, newest first (the API orders it). */
export function Timeline({ owner, today = todayIso() }: { owner: TimelineOwner; today?: string }) {
  const timeline = useTimeline(owner)
  if (timeline.isLoading) return <p className="py-6 text-sm text-ink-muted">Loading…</p>
  if (timeline.isError) return <p className="py-6 text-sm text-raspberry-ink">Couldn't load the timeline.</p>
  const entries = timeline.data ?? []
  if (entries.length === 0)
    return <p className="py-6 text-sm text-ink-muted">No activities yet. Log a call, email or note above.</p>
  return (
    <ol aria-label="Timeline" className="divide-y divide-line">
      {entries.map((e) => (
        <Entry key={e.id} entry={e} owner={owner} today={today} />
      ))}
    </ol>
  )
}
