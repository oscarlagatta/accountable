import { cn } from '@/lib/utils'
import { money, moneyShort } from '@/lib/format'

/** Money in mono with its currency. */
export function Money({ value, short = false, className }: { value: number | null | undefined; short?: boolean; className?: string }) {
  return <span className={cn('font-mono tabular-nums', className)}>{short ? moneyShort(value) : money(value)}</span>
}
