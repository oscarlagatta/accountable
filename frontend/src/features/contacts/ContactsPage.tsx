import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog, plural } from '@/components/ConfirmDialog'
import { DataTable, type Column } from '@/components/DataTable'
import { Page, PageHeader } from '@/components/PageHeader'
import { RecordLink } from '@/components/RecordLayout'
import { RecordSheet } from '@/components/RecordSheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CONTACT_STATUSES, contactDeletePreview, useContacts, useDeleteContact, type ContactRow, type ContactStatus } from './api'
import { ContactForm } from './ContactForm'
import { StatusBadge } from './StatusBadge'

export function contactConsequences(p: { deals: number; activities: number }) {
  const lines = []
  if (p.deals) lines.push(`${plural(p.deals, 'deal')} will have no main contact.`)
  if (p.activities) lines.push(`${plural(p.activities, 'activity', 'activities')} will be deleted.`)
  if (!lines.length) lines.push('No deals or activities are linked to them.')
  return lines
}

type Filter = ContactStatus | 'all'

export function StatusFilter({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  const options: { key: Filter; label: string }[] = [{ key: 'all', label: 'All' }, ...CONTACT_STATUSES]
  return (
    <div role="radiogroup" aria-label="Status" className="inline-flex items-center gap-1 rounded-md bg-page p-1">
      <span className="px-2 text-xs text-ink-muted">Status</span>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'rounded-sm px-3 py-1 text-[13px] font-medium text-ink-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            value === o.key && 'bg-panel text-ink shadow-panel',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ContactsPage() {
  const contacts = useContacts()
  const remove = useDeleteContact()
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<ContactRow | 'new' | null>(null)
  const [deleting, setDeleting] = useState<ContactRow | null>(null)

  const rows = useMemo(() => (contacts.data ?? []).filter((c) => filter === 'all' || c.status === filter), [contacts.data, filter])
  const columns = useMemo<Column<ContactRow>[]>(
    () => [
      { id: 'name', header: 'Name', value: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
      {
        id: 'organization',
        header: 'Organization',
        value: (r) => r.organization_name,
        cell: (r) => (r.organization_id ? <RecordLink to={`/organizations/${r.organization_id}`}>{r.organization_name}</RecordLink> : <span className="text-ink-muted">None</span>),
      },
      { id: 'job_title', header: 'Job title', value: (r) => r.job_title },
      { id: 'email', header: 'Email', value: (r) => r.email, className: 'text-ink-muted' },
      { id: 'phone', header: 'Phone', value: (r) => r.phone, className: 'font-mono text-xs text-ink-muted' },
      { id: 'status', header: 'Status', value: (r) => r.status, searchable: false, cell: (r) => <StatusBadge status={r.status} /> },
    ],
    [],
  )

  return (
    <Page>
      <PageHeader title="Contacts" subtitle={contacts.data ? `${plural(contacts.data.length, 'person', 'people')}: leads, qualified contacts and customers` : 'Loading…'} />
      <DataTable
        data={rows}
        columns={columns}
        noun="contacts"
        rowHref={(r) => `/contacts/${r.id}`}
        onEdit={setEditing}
        onDelete={setDeleting}
        emptyText={contacts.isLoading ? 'Loading…' : filter === 'all' ? 'No contacts yet. Add the first one.' : 'No contacts with this status.'}
        toolbar={
          <>
            <StatusFilter value={filter} onChange={setFilter} />
            <Button onClick={() => setEditing('new')}>
              <Plus /> Add contact
            </Button>
          </>
        }
      />
      <RecordSheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === 'new' ? 'Add contact' : 'Edit contact'}>
        {editing !== null ? (
          <ContactForm
            contact={editing === 'new' ? undefined : editing}
            defaults={filter !== 'all' ? { status: filter } : undefined}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              toast.success(editing === 'new' ? 'Contact added' : 'Contact saved')
              setEditing(null)
            }}
          />
        ) : null}
      </RecordSheet>
      {deleting ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          previewKey={['contacts', deleting.id]}
          loadPreview={() => contactDeletePreview(deleting.id)}
          consequences={contactConsequences}
          onConfirm={async () => {
            await remove.mutateAsync(deleting.id)
            toast.success('Contact deleted')
          }}
        />
      ) : null}
    </Page>
  )
}
