import { Money } from '@/components/Money'
import { RecordLink } from '@/components/RecordLayout'
import { date } from '@/lib/format'
import type { Deal } from './api'
import { LateLabel } from './LateLabel'
import { StageBadge } from './StageBadge'

/** A compact list of deals for record pages. */
export function DealList({ deals, empty, showOrganization = false }: { deals: Deal[]; empty: string; showOrganization?: boolean }) {
  if (deals.length === 0) return <p className="py-3 text-sm text-ink-muted">{empty}</p>
  return (
    <ul aria-label="Deals" className="divide-y divide-line">
      {deals.map((d) => (
        <li key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 py-2.5">
          <div className="min-w-0">
            <RecordLink to={`/deals/${d.id}`} className="font-medium">
              {d.name}
            </RecordLink>
            <div className="truncate text-[13px] text-ink-muted">
              {showOrganization ? d.organization_name ?? 'No organization' : d.contact_name ?? 'No main contact'}
            </div>
          </div>
          <StageBadge stage={d.stage} />
          <div className="w-28 text-right">
            <Money value={d.value} className="text-[13px] font-semibold" />
            <div className="font-mono text-xs text-ink-muted">{d.late ? <LateLabel /> : date(d.close_date)}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}
