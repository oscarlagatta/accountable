import { cn } from '@/lib/utils'
import { stageStyle } from './stages'

const LABELS: Record<string, string> = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

/** A small pill in the stage color. `prefix` adds "Stage: " so it can't be confused with a contact status. */
export function StageBadge({
  stage,
  label,
  prefix = false,
  className,
}: {
  stage: string
  label?: string
  prefix?: boolean
  className?: string
}) {
  const text = label ?? LABELS[stage] ?? stage
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        stageStyle(stage).fill,
        className,
      )}
    >
      {prefix ? `Stage: ${text}` : text}
    </span>
  )
}
