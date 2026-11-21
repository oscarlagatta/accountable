import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, plural } from '@/components/ConfirmDialog'
import { DataTable, type Column } from '@/components/DataTable'
import { Money } from '@/components/Money'
import { Page, PageHeader } from '@/components/PageHeader'
import { RecordLink } from '@/components/RecordLayout'
import { RecordSheet } from '@/components/RecordSheet'
import { Button } from '@/components/ui/button'
import { date } from '@/lib/format'
import { dealDeletePreview, useDeals, useDeleteDeal, useStages, type Deal } from './api'
import { DealForm } from './DealForm'
import { LateLabel } from './LateLabel'
import { StageBadge } from './StageBadge'
import { STAGE_KEYS } from './stages'

export function dealConsequences(p: { activities: number; stage_changes: number }) {
  const lines = []
  if (p.activities) lines.push(`${plural(p.activities, 'activity', 'activities')} will be deleted.`)
  if (p.stage_changes) lines.push(`${plural(p.stage_changes, 'stage change')} will be deleted from its history.`)
  if (!lines.length) lines.push('No activities are linked to it.')
  return lines
}

export function DealsPage() {
  const deals = useDeals()
  const stages = useStages()
  const remove = useDeleteDeal()
  const [editing, setEditing] = useState<Deal | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Deal | null>(null)
  const labels = useMemo(() => Object.fromEntries((stages.data ?? []).map((s) => [s.key, s.label])), [stages.data])

  const columns = useMemo<Column<Deal>[]>(
    () => [
      { id: 'name', header: 'Name', value: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
      {
        id: 'organization',
        header: 'Organization',
        value: (r) => r.organization_name,
        cell: (r) =>
          r.organization_id ? (
            <RecordLink to={`/organizations/${r.organization_id}`}>{r.organization_name}</RecordLink>
          ) : (
            <span className="text-ink-muted">None</span>
          ),
      },
      {
        id: 'contact',
        header: 'Main contact',
        value: (r) => r.contact_name,
        cell: (r) =>
          r.contact_id ? (
            <RecordLink to={`/contacts/${r.contact_id}`}>{r.contact_name}</RecordLink>
          ) : (
            <span className="text-ink-muted">None</span>
          ),
      },
      {
        id: 'stage',
        header: 'Stage',
        // Sorts in pipeline order; searches by its label.
        value: (r) => STAGE_KEYS.indexOf(r.stage),
        searchable: false,
        cell: (r) => <StageBadge stage={r.stage} label={labels[r.stage]} />,
      },
      { id: 'value', header: 'Value', value: (r) => r.value, numeric: true, cell: (r) => <Money value={r.value} /> },
      {
        id: 'probability',
        header: 'Probability',
        value: (r) => r.probability,
        numeric: true,
        cell: (r) => `${r.probability}%`,
      },
      {
        id: 'expected',
        header: 'Expected revenue',
        value: (r) => r.expected_revenue,
        numeric: true,
        cell: (r) => <Money value={r.expected_revenue} />,
      },
      {
        id: 'close_date',
        header: 'Close date',
        value: (r) => r.close_date,
        searchable: false,
        numeric: true,
        cell: (r) =>
          r.late ? (
            <span className="inline-flex items-center gap-2 text-raspberry-ink">
              <LateLabel />
              {date(r.close_date)}
            </span>
          ) : (
            date(r.close_date)
          ),
      },
      { id: 'stage_label', header: 'Stage name', value: (r) => labels[r.stage] ?? r.stage, hidden: true },
    ],
    [labels],
  )

  return (
    <Page>
      <PageHeader
        title="Deals"
        subtitle={deals.data ? `${plural(deals.data.length, 'deal')}, open and closed` : 'Loading…'}
      />
      <DataTable
        data={deals.data ?? []}
        columns={columns}
        noun="deals"
        rowHref={(r) => `/deals/${r.id}`}
        onEdit={setEditing}
        onDelete={setDeleting}
        emptyText={deals.isLoading ? 'Loading…' : 'No deals yet. Add the first one.'}
        toolbar={
          <Button onClick={() => setEditing('new')}>
            <Plus /> Add deal
          </Button>
        }
      />
      <RecordSheet
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === 'new' ? 'Add deal' : 'Edit deal'}
      >
        {editing !== null ? (
          <DealForm
            deal={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              toast.success(editing === 'new' ? 'Deal added' : 'Deal saved')
              setEditing(null)
            }}
          />
        ) : null}
      </RecordSheet>
      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          previewKey={['deals', deleting.id]}
          loadPreview={() => dealDeletePreview(deleting.id)}
          consequences={dealConsequences}
          onConfirm={async () => {
            await remove.mutateAsync(deleting.id)
            toast.success('Deal deleted')
          }}
        />
      ) : null}
    </Page>
  )
}
