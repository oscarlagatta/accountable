import type { MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

/** A linked record name: a real link to that record's page. Clicks don't reach a clickable row behind it. */
export function RecordLink({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link to={to} onClick={(e: MouseEvent) => e.stopPropagation()} className={cn('text-cerulean-ink hover:underline', className)}>
      {children}
    </Link>
  )
}

export function RecordHeader({ title, badges, figures, actions, subtitle }: { title: string; badges?: ReactNode; figures?: ReactNode; actions?: ReactNode; subtitle?: ReactNode }) {
  return (
    <section className="mb-4 rounded-lg bg-panel px-6 py-5 shadow-panel">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {badges}
          </div>
          {subtitle ? <div className="mt-1 text-[13px] text-ink-muted">{subtitle}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      {figures ? <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3">{figures}</dl> : null}
    </section>
  )
}

export function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums">{children}</dd>
    </div>
  )
}

export function Details({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-2.5 text-sm">
      {items.map((i) => (
        <div key={i.label} className="contents">
          <dt className="text-ink-muted">{i.label}</dt>
          <dd className="min-w-0 break-words">{i.value ?? <span className="text-ink-muted">Not set</span>}</dd>
        </div>
      ))}
    </dl>
  )
}

export function NotFoundMessage({ what, back }: { what: string; back: { to: string; label: string } }) {
  return (
    <div className="mx-auto max-w-[1440px] px-8 pt-16 text-center">
      <h1 className="text-xl font-semibold">{what} not found</h1>
      <p className="mt-2 text-sm text-ink-muted">It may have been deleted.</p>
      <Link to={back.to} className="mt-4 inline-block text-cerulean-ink hover:underline">
        {back.label}
      </Link>
    </div>
  )
}
