import { forwardRef, type HTMLAttributes } from 'react'
import { Link } from 'react-router'
import type { Deal } from '@/features/deals/api'
import { LateLabel } from '@/features/deals/LateLabel'
import { dateShort, money } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = HTMLAttributes<HTMLDivElement> & { deal: Deal; lifted?: boolean; placeholder?: boolean }

/** A deal on the board: name, organization and main contact, value, and close date or "Late". */
export const Card = forwardRef<HTMLDivElement, Props>(function Card({ deal, lifted = false, placeholder = false, className, ...rest }, ref) {
  if (placeholder) {
    return <div ref={ref} {...rest} className="mb-1.5 h-[74px] rounded-md border-2 border-dashed border-ink-faint" aria-hidden />
  }
  const meta = [deal.organization_name, deal.contact_name].filter(Boolean).join(' · ')
  return (
    <div
      ref={ref}
      data-testid="deal-card"
      data-deal-id={deal.id}
      {...rest}
      className={cn(
        'mb-1.5 cursor-grab touch-none rounded-md bg-page px-3 py-2.5 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
        lifted && '-rotate-2 cursor-grabbing bg-panel shadow-lift',
        className,
      )}
    >
      <Link
        to={`/deals/${deal.id}`}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        className="block text-[13px] leading-snug font-semibold text-ink hover:underline"
      >
        {deal.name}
      </Link>
      {meta ? <div className="mt-0.5 text-xs leading-snug text-ink-muted">{meta}</div> : null}
      <div className="mt-2 flex items-center justify-between font-mono text-xs">
        <span className="text-[13px] font-semibold">{money(deal.value)}</span>
        {deal.late ? <LateLabel /> : <span className="text-[11px] font-medium text-ink-muted">{dateShort(deal.close_date)}</span>}
      </div>
    </div>
  )
})
