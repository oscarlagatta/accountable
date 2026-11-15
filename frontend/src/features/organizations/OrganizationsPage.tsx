import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, plural } from '@/components/ConfirmDialog'
import { DataTable, type Column } from '@/components/DataTable'
import { Money } from '@/components/Money'
import { Page, PageHeader } from '@/components/PageHeader'
import { RecordSheet } from '@/components/RecordSheet'
import { Button } from '@/components/ui/button'
import { organizationDeletePreview, useDeleteOrganization, useOrganization, useOrganizations, type OrganizationRow } from './api'
import { OrganizationForm } from './OrganizationForm'

export function organizationConsequences(p: { contacts: number; deals: number }) {
  const lines = []
  if (p.contacts) lines.push(`${plural(p.contacts, 'contact')} will have no organization.`)
  if (p.deals) lines.push(`${plural(p.deals, 'deal')} will have no organization.`)
  if (!lines.length) lines.push('No contacts or deals are linked to it.')
  else lines.push('They are kept.')
  return lines
}

export function OrganizationsPage() {
  const orgs = useOrganizations()
  const remove = useDeleteOrganization()
  const [editing, setEditing] = useState<OrganizationRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<OrganizationRow | null>(null)

  const columns = useMemo<Column<OrganizationRow>[]>(
    () => [
      { id: 'name', header: 'Name', value: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
      { id: 'industry', header: 'Industry', value: (r) => r.industry },
      { id: 'website', header: 'Website', value: (r) => r.website?.replace(/^https?:\/\/(www\.)?/, ''), className: 'text-ink-muted' },
      { id: 'contacts', header: 'Contacts', value: (r) => r.contact_count, numeric: true },
      { id: 'open_deals', header: 'Open deals', value: (r) => r.open_deal_count, numeric: true },
      { id: 'open_value', header: 'Open value', value: (r) => r.open_value, numeric: true, cell: (r) => <Money value={r.open_value} /> },
    ],
    [],
  )

  return (
    <Page>
      <PageHeader title="Organizations" subtitle={orgs.data ? `${plural(orgs.data.length, 'company', 'companies')} we do business with` : 'Loading…'} />
      {orgs.isError ? <p className="text-raspberry-ink">Couldn't load organizations.</p> : null}
      <DataTable
        data={orgs.data ?? []}
        columns={columns}
        noun="organizations"
        rowHref={(r) => `/organizations/${r.id}`}
        onEdit={setEditing}
        onDelete={setDeleting}
        emptyText={orgs.isLoading ? 'Loading…' : 'No organizations yet. Add the first one.'}
        toolbar={
          <Button onClick={() => setEditing('new')}>
            <Plus /> Add organization
          </Button>
        }
      />
      <RecordSheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === 'new' ? 'Add organization' : 'Edit organization'}>
        {editing !== null ? (
          editing === 'new' ? (
            <OrganizationForm
              onCancel={() => setEditing(null)}
              onSaved={() => {
                toast.success('Organization added')
                setEditing(null)
              }}
            />
          ) : (
            <EditOrganization id={editing.id} onClose={() => setEditing(null)} />
          )
        ) : null}
      </RecordSheet>
      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          previewKey={['organizations', deleting.id]}
          loadPreview={() => organizationDeletePreview(deleting.id)}
          consequences={organizationConsequences}
          onConfirm={async () => {
            await remove.mutateAsync(deleting.id)
            toast.success('Organization deleted')
          }}
        />
      ) : null}
    </Page>
  )
}

/** The table's rows don't carry notes, so the edit form loads the full record first. */
function EditOrganization({ id, onClose }: { id: number; onClose: () => void }) {
  const org = useOrganization(id)
  if (!org.data) return <p className="text-sm text-ink-muted">Loading…</p>
  return (
    <OrganizationForm
      organization={org.data}
      onCancel={onClose}
      onSaved={() => {
        toast.success('Organization saved')
        onClose()
      }}
    />
  )
}
