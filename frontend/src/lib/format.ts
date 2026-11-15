import { format, isValid, parseISO } from 'date-fns'

const whole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 })

/** Whole US dollars, always with the dollar sign: $45,000. */
export function money(value: number | null | undefined): string {
  return whole.format(Math.round(value ?? 0))
}

/** Shortened for the dashboard: $950K, $1.2M. Small amounts stay whole. */
export function moneyShort(value: number | null | undefined): string {
  const v = Math.round(value ?? 0)
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${trim(abs / 1_000_000, abs >= 10_000_000 ? 1 : 2)}M`
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}K`
  if (abs >= 1_000) return `${sign}$${trim(abs / 1000, 1)}K`
  return money(v)
}

function trim(n: number, digits: number): string {
  return n.toFixed(digits).replace(/\.?0+$/, '')
}

export function percent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${Math.round(value)}%`
}

function toDate(value: string | Date): Date | null {
  const d = typeof value === 'string' ? parseISO(value) : value
  return isValid(d) ? d : null
}

/** Nov 15, 2026 */
export function date(value: string | Date | null | undefined): string {
  const d = value ? toDate(value) : null
  return d ? format(d, 'MMM d, yyyy') : ''
}

/** Nov 15, for cards and chips. */
export function dateShort(value: string | Date | null | undefined): string {
  const d = value ? toDate(value) : null
  return d ? format(d, 'MMM d') : ''
}

/** Sunday, November 15, 2026 */
export function dateLong(value: string | Date): string {
  const d = toDate(value)
  return d ? format(d, 'EEEE, MMMM d, yyyy') : ''
}

/** Nov 15, 2026, 9:42 AM */
export function dateTime(value: string | Date | null | undefined): string {
  const d = value ? toDate(value) : null
  return d ? format(d, 'MMM d, yyyy, h:mm a') : ''
}

/** "Today, 9:42", "Yesterday", or "Nov 13", relative to `today` (YYYY-MM-DD). */
export function when(value: string, today: string): string {
  const d = toDate(value)
  if (!d) return ''
  const day = value.slice(0, 10)
  if (day === today) return `Today, ${format(d, 'H:mm')}`
  const t = parseISO(today)
  const yesterday = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1)
  if (day === format(yesterday, 'yyyy-MM-dd')) return 'Yesterday'
  return d.getFullYear() === t.getFullYear() ? format(d, 'MMM d') : format(d, 'MMM d, yyyy')
}

/** The local date as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  return format(now, 'yyyy-MM-dd')
}

/** A value for <input type="datetime-local">. */
export function toLocalInput(value: string | Date): string {
  const d = toDate(value)
  return d ? format(d, "yyyy-MM-dd'T'HH:mm") : ''
}
