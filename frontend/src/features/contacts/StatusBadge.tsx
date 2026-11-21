import { cn } from '@/lib/utils'
import type { ContactStatus } from './api'

const LABELS: Record<ContactStatus, string> = { lead: 'Lead', qualified: 'Qualified', customer: 'Customer' }
const STYLES: Record<ContactStatus, string> = {
  lead: 'bg-page text-ink',
  qualified: 'bg-marigold/35 text-ink',
  customer: 'bg-sea-green/20 text-sea-green-ink',
}

export function statusLabel(status: ContactStatus) {
  return `Status: ${LABELS[status]}`
}

/** Always reads "Status: Qualified" and so on, so it can't be confused with the deal stage. */
export function StatusBadge({ status, className }: { status: ContactStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        STYLES[status],
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  )
}
