import { toast } from 'sonner'
import { Panel, PanelTitle } from '@/components/PageHeader'
import { RecordLink } from '@/components/RecordLayout'
import { Checkbox } from '@/components/ui/checkbox'
import { useUpdateActivity, type TimelineEntry } from '@/features/activities/api'
import { FollowUpChip } from '@/features/activities/Timeline'
import { stageStyle } from '@/features/deals/stages'
import { when } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FollowUp } from './api'

function On({ entry }: { entry: TimelineEntry }) {
  if (entry.deal_id) return <RecordLink to={`/deals/${entry.deal_id}`} className="text-[13px]">{entry.deal_name}</RecordLink>
  if (entry.contact_id) return <RecordLink to={`/contacts/${entry.contact_id}`} className="text-[13px]">{entry.contact_name}</RecordLink>
  return null
}

export function FollowUps({ items, today }: { items: FollowUp[]; today: string }) {
  const update = useUpdateActivity()
  async function markDone(f: FollowUp) {
    try {
      await update.mutateAsync({ id: f.id, data: { done: true } })
      toast.success('Follow-up marked done')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not mark it done')
    }
  }
  return (
    <Panel>
      <PanelTitle aside="Overdue first">Follow-ups</PanelTitle>
      {items.length === 0 ? (
        <p className="py-6 text-sm text-ink-muted">Nothing to follow up. Add a follow-up date when you log an activity.</p>
      ) : (
        <table className="w-full border-collapse text-sm" aria-label="Follow-ups">
          <thead>
            <tr>
              <th className="w-7 px-2 pb-2">
                <span className="sr-only">Done</span>
              </th>
              <th className="px-2 pb-2 text-left text-xs font-medium text-ink-muted">Task</th>
              <th className="px-2 pb-2 text-left text-xs font-medium text-ink-muted">On</th>
              <th className="px-2 pb-2 text-right text-xs font-medium text-ink-muted">Due</th>
            </tr>
          </thead>
          <tbody>
            {items.map((f) => (
              <tr key={f.id} className="border-t border-line" data-testid="follow-up">
                <td className="px-2 py-2.5">
                  <Checkbox className="size-[18px] rounded-[5px] border-0 bg-page data-[state=checked]:bg-sea-green" aria-label={`Mark done: ${f.description}`} onCheckedChange={() => markDone(f)} disabled={update.isPending} />
                </td>
                <td className="px-2 py-2.5 font-medium">{f.description}</td>
                <td className="px-2 py-2.5">
                  <On entry={f} />
                </td>
                <td className="px-2 py-2.5 text-right">
                  <FollowUpChip date={f.follow_up_date!} today={today} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}

export function RecentActivity({ items, today }: { items: TimelineEntry[]; today: string }) {
  return (
    <Panel>
      <PanelTitle aside={`Latest ${items.length}`}>Recent activity</PanelTitle>
      {items.length === 0 ? (
        <p className="py-6 text-sm text-ink-muted">No activity yet.</p>
      ) : (
        <ol aria-label="Recent activity">
          {items.map((e, i) => (
            <li key={e.id} data-testid="recent-entry" className={cn('grid grid-cols-[10px_1fr_auto] items-start gap-3 py-2.5', i > 0 && 'border-t border-line')}>
              <span
                aria-hidden
                className={cn('mt-[5px] size-2.5 rounded-full', e.kind === 'stage_change' && e.to_stage ? stageStyle(e.to_stage).bg : 'bg-mist')}
              />
              <div className="min-w-0">
                <div className="font-medium">{e.description}</div>
                <On entry={e} />
              </div>
              <span className="font-mono text-xs whitespace-nowrap text-ink-muted">{when(e.occurred_at, today)}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
