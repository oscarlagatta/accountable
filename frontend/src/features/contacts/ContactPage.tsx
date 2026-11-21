import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Page, Panel, PanelTitle } from '@/components/PageHeader'
import { Details, NotFoundMessage, RecordHeader, RecordLink } from '@/components/RecordLayout'
import { RecordSheet } from '@/components/RecordSheet'
import { Button } from '@/components/ui/button'
import { ActivityForm } from '@/features/activities/ActivityForm'
import { Timeline } from '@/features/activities/Timeline'
import { DealForm } from '@/features/deals/DealForm'
import { DealList } from '@/features/deals/DealList'
import { ApiError } from '@/lib/api'
import { contactDeletePreview, useContact, useDeleteContact } from './api'
import { ContactForm } from './ContactForm'
import { contactConsequences } from './ContactsPage'
import { StatusBadge } from './StatusBadge'

export function ContactPage() {
  const id = Number(useParams().id)
  const contact = useContact(id)
  const remove = useDeleteContact()
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<'edit' | 'deal' | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (contact.error instanceof ApiError && contact.error.status === 404)
    return <NotFoundMessage what="Contact" back={{ to: '/contacts', label: 'Back to contacts' }} />
  if (!contact.data)
    return (
      <Page>
        {contact.isError ? (
          <p className="text-raspberry-ink">Couldn't load this contact.</p>
        ) : (
          <p className="text-ink-muted">Loading…</p>
        )}
      </Page>
    )
  const c = contact.data

  return (
    <Page>
      <RecordHeader
        title={c.name}
        badges={<StatusBadge status={c.status} />}
        subtitle={
          <>
            {c.job_title ?? 'Contact'}
            {c.organization_id ? (
              <>
                {' at '}
                <RecordLink to={`/organizations/${c.organization_id}`}>{c.organization_name}</RecordLink>
              </>
            ) : null}
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setSheet('edit')}>
              <Pencil /> Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleting(true)}>
              <Trash2 /> Delete
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelTitle>Details</PanelTitle>
            <Details
              items={[
                {
                  label: 'Organization',
                  value: c.organization_id ? (
                    <RecordLink to={`/organizations/${c.organization_id}`}>{c.organization_name}</RecordLink>
                  ) : (
                    'None'
                  ),
                },
                { label: 'Job title', value: c.job_title },
                {
                  label: 'Email',
                  value: c.email ? (
                    <a className="text-cerulean-ink hover:underline" href={`mailto:${c.email}`}>
                      {c.email}
                    </a>
                  ) : null,
                },
                { label: 'Phone', value: c.phone ? <span className="font-mono text-[13px]">{c.phone}</span> : null },
                { label: 'Status', value: <StatusBadge status={c.status} /> },
              ]}
            />
          </Panel>
          <Panel>
            <PanelTitle
              aside={
                <Button size="sm" onClick={() => setSheet('deal')}>
                  <Plus /> Add deal
                </Button>
              }
            >
              Deals
            </PanelTitle>
            <DealList deals={c.deals} showOrganization empty={`${c.first_name} isn't the main contact on any deals.`} />
          </Panel>
        </div>
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelTitle>Log activity</PanelTitle>
            <ActivityForm owner={{ kind: 'contact', id: c.id }} />
          </Panel>
          <Panel>
            <PanelTitle aside="Newest first">Timeline</PanelTitle>
            <Timeline owner={{ kind: 'contact', id: c.id }} />
          </Panel>
        </div>
      </div>

      <RecordSheet
        open={sheet !== null}
        onOpenChange={(open) => !open && setSheet(null)}
        title={sheet === 'edit' ? 'Edit contact' : 'Add deal'}
      >
        {sheet === 'edit' ? (
          <ContactForm
            contact={c}
            onCancel={() => setSheet(null)}
            onSaved={() => {
              toast.success('Contact saved')
              setSheet(null)
            }}
          />
        ) : null}
        {sheet === 'deal' ? (
          <DealForm
            defaults={{ contact_id: c.id, organization_id: c.organization_id }}
            onCancel={() => setSheet(null)}
            onSaved={() => {
              toast.success('Deal added')
              setSheet(null)
            }}
          />
        ) : null}
      </RecordSheet>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        previewKey={['contacts', c.id]}
        loadPreview={() => contactDeletePreview(c.id)}
        consequences={contactConsequences}
        onConfirm={async () => {
          await remove.mutateAsync(c.id)
          toast.success('Contact deleted')
          navigate('/contacts')
        }}
      />
    </Page>
  )
}
