import { useState } from 'react'
import { toast } from 'sonner'
import { Page, PageHeader } from '@/components/PageHeader'
import { RecordSheet } from '@/components/RecordSheet'
import { Button } from '@/components/ui/button'
import { ActivityForm } from '@/features/activities/ActivityForm'
import { DealForm } from '@/features/deals/DealForm'
import { dateLong } from '@/lib/format'
import { useDashboard } from './api'
import { FunnelChart, RevenueChart, WonLostChart } from './Charts'
import { FeaturePanel } from './FeaturePanel'
import { FollowUps, RecentActivity } from './Lists'

export function greeting(now: Date = new Date()) {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function DashboardPage() {
  const dashboard = useDashboard()
  const [sheet, setSheet] = useState<'activity' | 'deal' | null>(null)
  const data = dashboard.data

  return (
    <Page>
      <PageHeader
        title={greeting()}
        subtitle={dateLong(new Date())}
        actions={
          <>
            <Button variant="secondary" onClick={() => setSheet('activity')}>
              Log activity
            </Button>
            <Button onClick={() => setSheet('deal')}>Add deal</Button>
          </>
        }
      />
      {dashboard.isError ? <p className="text-raspberry-ink">Couldn't load the dashboard.</p> : null}
      {data ? (
        <>
          <FeaturePanel data={data} />
          <div className="mb-4 grid grid-cols-3 gap-4">
            <RevenueChart months={data.months} />
            <WonLostChart months={data.months} />
            <FunnelChart funnel={data.funnel} />
          </div>
          <div className="grid grid-cols-[3fr_2fr] items-start gap-4">
            <FollowUps items={data.follow_ups} today={data.today} />
            <RecentActivity items={data.recent} today={data.today} />
          </div>
        </>
      ) : dashboard.isLoading ? (
        <p className="text-ink-muted">Loading…</p>
      ) : null}

      <RecordSheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)} title={sheet === 'activity' ? 'Log activity' : 'Add deal'}>
        {sheet === 'activity' ? <ActivityForm pickTarget onDone={() => setSheet(null)} onCancel={() => setSheet(null)} /> : null}
        {sheet === 'deal' ? (
          <DealForm
            onCancel={() => setSheet(null)}
            onSaved={() => {
              toast.success('Deal added')
              setSheet(null)
            }}
          />
        ) : null}
      </RecordSheet>
    </Page>
  )
}
