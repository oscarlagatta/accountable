import { Link } from 'react-router'
import { stageStyle } from '@/features/deals/stages'
import { money, percent } from '@/lib/format'
import type { Dashboard } from './api'

/** The Midnight panel: summary figures on the left, where the open value sits on the right. */
export function FeaturePanel({ data }: { data: Dashboard }) {
  const s = data.summary
  return (
    <section
      aria-label="Summary"
      className="mb-4 grid grid-cols-[1.1fr_2fr] gap-9 rounded-xl bg-ink px-7 py-6 text-mist"
    >
      <div>
        <div className="text-[13px] text-mist-muted">Open pipeline</div>
        <div
          data-testid="open-value"
          className="mt-0.5 mb-3.5 font-mono text-[40px] leading-tight font-semibold tracking-tight text-white"
        >
          {money(s.open_value)}
        </div>
        <dl className="flex flex-col gap-3.5">
          <div className="flex gap-8">
            <Stat label="Expected revenue" value={money(s.open_expected)} testId="open-expected" />
            <Stat label="Won this month" value={money(s.won_this_month)} testId="won-this-month" />
          </div>
          <div className="flex gap-8">
            <Stat label="Win rate, 12 months" value={percent(s.win_rate)} testId="win-rate" />
            <Stat
              label="Follow-ups overdue"
              value={`${s.overdue_follow_ups} of ${s.open_follow_ups}`}
              testId="follow-ups-overdue"
              alert={s.overdue_follow_ups > 0}
            />
          </div>
        </dl>
      </div>
      <div>
        <div className="text-[13px] text-mist-muted">Where the open value sits</div>
        <Link
          to="/pipeline"
          aria-label="Open the pipeline board"
          data-testid="pipeline-strip"
          className="my-1.5 mb-3.5 flex h-11 gap-[3px] rounded-sm focus-visible:ring-2 focus-visible:ring-sea-green focus-visible:outline-none"
        >
          {data.strip.map((st) =>
            st.value > 0 ? (
              <div
                key={st.stage}
                data-stage={st.stage}
                title={`${st.label}: ${money(st.value)}`}
                className={`rounded-sm transition-opacity hover:opacity-90 ${stageStyle(st.stage).bg}`}
                style={{ flexGrow: st.value }}
              />
            ) : null,
          )}
        </Link>
        <div className="grid grid-cols-4 gap-4">
          {data.strip.map((st) => (
            <Link
              key={st.stage}
              to="/pipeline"
              data-testid="strip-stage"
              className="rounded-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sea-green focus-visible:outline-none"
            >
              <div className="flex items-center gap-2 font-semibold text-white">
                <i className={`size-2.5 rounded-[3px] ${stageStyle(st.stage).bg}`} aria-hidden />
                {st.label}
                <span className="font-mono text-xs font-normal text-mist-muted">{st.count}</span>
              </div>
              <div className="mt-1 font-mono text-xs text-mist">{money(st.value)}</div>
              <div className="font-mono text-xs text-mist-muted">{money(st.expected)} expected</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  testId,
  alert = false,
}: {
  label: string
  value: string
  testId: string
  alert?: boolean
}) {
  return (
    <div>
      <dt className="text-[13px] text-mist-muted">{label}</dt>
      <dd
        data-testid={testId}
        className={`font-mono text-xl font-semibold ${alert ? 'text-raspberry-on-dark' : 'text-white'}`}
      >
        {value}
      </dd>
    </div>
  )
}
