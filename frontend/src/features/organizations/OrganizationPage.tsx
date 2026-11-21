import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Money } from '@/components/Money'
import { Page, Panel, PanelTitle } from '@/components/PageHeader'
import { Details, Figure, NotFoundMessage, RecordHeader, RecordLink } from '@/components/RecordLayout'
import { RecordSheet } from '@/components/RecordSheet'
import { Button } from '@/components/ui/button'
import { ContactForm } from '@/features/contacts/ContactForm'
import { StatusBadge } from '@/features/contacts/StatusBadge'
import { DealForm } from '@/features/deals/DealForm'
import { DealList } from '@/features/deals/DealList'
import { ApiError } from '@/lib/api'
import { organizationDeletePreview, useDeleteOrganization, useOrganization } from './api'
import { OrganizationForm } from './OrganizationForm'
import { organizationConsequences } from './OrganizationsPage'

/** The organization's website as a link target, adding https:// when the stored value has no scheme. */
function websiteHref(website: string | null) {
  if (!website) return null
  return website.startsWith('http') ? website : `https://${website}`
}

export function OrganizationPage() {
  const id = Number(useParams().id)
  const org = useOrganization(id)
  const remove = useDeleteOrganization()
  const navigate = useNavigate()
  const [sheet, setSheet] = useState<'edit' | 'contact' | 'deal' | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (org.error instanceof ApiError && org.error.status === 404)
    return <NotFoundMessage what="Organization" back={{ to: '/organizations', label: 'Back to organizations' }} />
  if (!org.data)
    return (
      <Page>
        {org.isError ? (
          <p className="text-raspberry-ink">Couldn't load this organization.</p>
        ) : (
          <p className="text-ink-muted">Loading…</p>
        )}
      </Page>
    )
  const o = org.data
  const openDeals = o.deals.filter((d) => !['won', 'lost'].includes(d.stage))
  const website = websiteHref(o.website)

  return (
    <Page>
      <RecordHeader
        title={o.name}
        badges={
          o.industry ? (
            <span className="rounded-full bg-page px-2 py-0.5 text-xs font-semibold">{o.industry}</span>
          ) : null
        }
        subtitle="Organization"
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
        figures={
          <>
            <Figure label="Contacts">{o.contacts.length}</Figure>
            <Figure label="Open deals">{openDeals.length}</Figure>
            <Figure label="Open value">
              <Money value={openDeals.reduce((s, d) => s + d.value, 0)} />
            </Figure>
          </>
        }
      />
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
        <Panel className="self-start">
          <PanelTitle>Details</PanelTitle>
          <Details
            items={[
              { label: 'Industry', value: o.industry },
              {
                label: 'Website',
                value: website ? (
                  <a href={website} target="_blank" rel="noreferrer" className="text-cerulean-ink hover:underline">
                    {o.website}
                  </a>
                ) : null,
              },
              { label: 'Notes', value: o.notes ? <span className="whitespace-pre-line">{o.notes}</span> : null },
            ]}
          />
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel>
            <PanelTitle
              aside={
                <Button size="sm" onClick={() => setSheet('contact')}>
                  <Plus /> Add contact
                </Button>
              }
            >
              Contacts
            </PanelTitle>
            {o.contacts.length === 0 ? (
              <p className="py-3 text-sm text-ink-muted">No contacts at {o.name} yet.</p>
            ) : (
              <ul aria-label="Contacts" className="divide-y divide-line">
                {o.contacts.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <RecordLink to={`/contacts/${c.id}`} className="font-medium">
                        {c.name}
                      </RecordLink>
                      <div className="truncate text-[13px] text-ink-muted">
                        {[c.job_title, c.email].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
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
            <DealList deals={o.deals} empty={`No deals with ${o.name} yet.`} />
          </Panel>
        </div>
      </div>

      <RecordSheet
        open={sheet !== null}
        onOpenChange={(open) => !open && setSheet(null)}
        title={sheet === 'edit' ? 'Edit organization' : sheet === 'contact' ? 'Add contact' : 'Add deal'}
      >
        {sheet === 'edit' ? (
          <OrganizationForm
            organization={o}
            onCancel={() => setSheet(null)}
            onSaved={() => {
              toast.success('Organization saved')
              setSheet(null)
            }}
          />
        ) : null}
        {sheet === 'contact' ? (
          <ContactForm
            defaults={{ organization_id: o.id }}
            onCancel={() => setSheet(null)}
            onSaved={() => {
              toast.success('Contact added')
              setSheet(null)
            }}
          />
        ) : null}
        {sheet === 'deal' ? (
          <DealForm
            defaults={{ organization_id: o.id }}
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
        previewKey={['organizations', o.id]}
        loadPreview={() => organizationDeletePreview(o.id)}
        consequences={organizationConsequences}
        onConfirm={async () => {
          await remove.mutateAsync(o.id)
          toast.success('Organization deleted')
          navigate('/organizations')
        }}
      />
    </Page>
  )
}
