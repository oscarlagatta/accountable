import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Money } from '@/components/Money'
import { Page, Panel, PanelTitle } from '@/components/PageHeader'
import { Details, Figure, NotFoundMessage, RecordHeader, RecordLink } from '@/components/RecordLayout'
import { RecordSheet } from '@/components/RecordSheet'
import { Button } from '@/components/ui/button'
import { ActivityForm } from '@/features/activities/ActivityForm'
import { Timeline } from '@/features/activities/Timeline'
import { ApiError } from '@/lib/api'
import { date } from '@/lib/format'
import { dealDeletePreview, useDeal, useDeleteDeal, useStages } from './api'
import { DealForm } from './DealForm'
import { dealConsequences } from './DealsPage'
import { LateLabel } from './LateLabel'
import { StageBadge } from './StageBadge'

export function DealPage() {
  const id = Number(useParams().id)
  const deal = useDeal(id)
  const stages = useStages()
  const remove = useDeleteDeal()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (deal.error instanceof ApiError && deal.error.status === 404)
    return <NotFoundMessage what="Deal" back={{ to: '/deals', label: 'Back to deals' }} />
  if (!deal.data)
    return (
      <Page>
        {deal.isError ? (
          <p className="text-raspberry-ink">Couldn't load this deal.</p>
        ) : (
          <p className="text-ink-muted">Loading…</p>
        )}
      </Page>
    )
  const d = deal.data
  const stageLabel = stages.data?.find((s) => s.key === d.stage)?.label
  const org = d.organization_id ? (
    <RecordLink to={`/organizations/${d.organization_id}`}>{d.organization_name}</RecordLink>
  ) : (
    'None'
  )
  const contact = d.contact_id ? <RecordLink to={`/contacts/${d.contact_id}`}>{d.contact_name}</RecordLink> : 'None'

  return (
    <Page>
      <RecordHeader
        title={d.name}
        badges={
          <>
            <StageBadge stage={d.stage} label={stageLabel} prefix />
            {d.late ? <LateLabel /> : null}
          </>
        }
        subtitle={
          <>
            Deal with {org} · Main contact {contact}
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil /> Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleting(true)}>
              <Trash2 /> Delete
            </Button>
          </>
        }
        figures={
          <>
            <Figure label="Value">
              <Money value={d.value} />
            </Figure>
            <Figure label="Probability">{d.probability}%</Figure>
            <Figure label="Expected revenue">
              <Money value={d.expected_revenue} />
            </Figure>
            <Figure label={['won', 'lost'].includes(d.stage) ? 'Closed' : 'Close date'}>
              <span className={d.late ? 'text-raspberry-ink' : ''}>{date(d.close_date)}</span>
            </Figure>
          </>
        }
      />
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
        <Panel className="self-start">
          <PanelTitle>Details</PanelTitle>
          <Details
            items={[
              { label: 'Stage', value: <StageBadge stage={d.stage} label={stageLabel} /> },
              { label: 'Organization', value: org },
              { label: 'Main contact', value: contact },
              { label: 'Value', value: <Money value={d.value} /> },
              { label: 'Probability', value: <span className="font-mono">{d.probability}%</span> },
              { label: 'Expected revenue', value: <Money value={d.expected_revenue} /> },
              { label: 'Close date', value: <span className="font-mono">{date(d.close_date)}</span> },
            ]}
          />
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelTitle>Log activity</PanelTitle>
            <ActivityForm owner={{ kind: 'deal', id: d.id }} />
          </Panel>
          <Panel>
            <PanelTitle aside="Newest first">Timeline</PanelTitle>
            <Timeline owner={{ kind: 'deal', id: d.id }} />
          </Panel>
        </div>
      </div>

      <RecordSheet open={editing} onOpenChange={setEditing} title="Edit deal">
        {editing ? (
          <DealForm
            deal={d}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              toast.success('Deal saved')
              setEditing(false)
            }}
          />
        ) : null}
      </RecordSheet>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        previewKey={['deals', d.id]}
        loadPreview={() => dealDeletePreview(d.id)}
        consequences={dealConsequences}
        onConfirm={async () => {
          await remove.mutateAsync(d.id)
          toast.success('Deal deleted')
          navigate('/deals')
        }}
      />
    </Page>
  )
}
