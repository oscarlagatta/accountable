import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormActions, FormRow, applyServerErrors } from '@/components/form'
import { RecordPicker } from '@/components/RecordPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOrganizations } from '@/features/organizations/api'
import {
  CONTACT_STATUSES,
  useSaveContact,
  type Contact,
  type ContactInput,
  type ContactRow,
  type ContactStatus,
} from './api'

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const contactSchema = z.object({
  first_name: z.string().trim().min(1, 'Required'),
  last_name: z.string().trim().min(1, 'Required'),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || EMAIL.test(v), 'Enter a valid email address'),
  phone: z.string().trim(),
  job_title: z.string().trim(),
  organization_id: z.string().nullable(),
  status: z.enum(['lead', 'qualified', 'customer']),
})
type Values = z.infer<typeof contactSchema>

const blank = (v: string) => (v === '' ? null : v)

type Defaults = { organization_id?: number | null; status?: ContactStatus }

/** The form's starting values: the contact being edited, or a new contact with the given defaults. */
function initialValues(contact: ContactRow | undefined, defaults: Defaults | undefined): Values {
  return {
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    job_title: contact?.job_title ?? '',
    organization_id: initialOrganization(contact, defaults),
    status: contact?.status ?? defaults?.status ?? 'lead',
  }
}

function initialOrganization(contact: ContactRow | undefined, defaults: Defaults | undefined) {
  const orgId = contact ? contact.organization_id : (defaults?.organization_id ?? null)
  return orgId === null ? null : String(orgId)
}

function toInput(v: Values): ContactInput {
  return {
    first_name: v.first_name,
    last_name: v.last_name,
    email: blank(v.email),
    phone: blank(v.phone),
    job_title: blank(v.job_title),
    organization_id: v.organization_id ? Number(v.organization_id) : null,
    status: v.status,
  }
}

export function ContactForm({
  contact,
  defaults,
  onSaved,
  onCancel,
}: {
  contact?: ContactRow
  defaults?: Defaults
  onSaved: (c: Contact) => void
  onCancel: () => void
}) {
  const save = useSaveContact()
  const orgs = useOrganizations()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, setError, setFocus, control, formState } = useForm<Values>({
    resolver: zodResolver(contactSchema),
    defaultValues: initialValues(contact, defaults),
  })
  const errors = formState.errors
  // The first name field takes focus when the form opens.
  useEffect(() => setFocus('first_name'), [setFocus])
  const orgOptions = useMemo(
    () => (orgs.data ?? []).map((o) => ({ value: String(o.id), label: o.name, detail: o.industry })),
    [orgs.data],
  )

  async function onSubmit(v: Values) {
    setFormError(null)
    const data = toInput(v)
    try {
      onSaved(await save.mutateAsync({ id: contact?.id, data }))
    } catch (e) {
      setFormError(applyServerErrors(e, setError, Object.keys(data)))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <FormRow id="contact-first" label="First name" error={errors.first_name?.message}>
          <Input id="contact-first" aria-invalid={!!errors.first_name} {...register('first_name')} />
        </FormRow>
        <FormRow id="contact-last" label="Last name" error={errors.last_name?.message}>
          <Input id="contact-last" aria-invalid={!!errors.last_name} {...register('last_name')} />
        </FormRow>
      </div>
      <FormRow id="contact-status" label="Status" error={errors.status?.message}>
        <Controller
          control={control}
          name="status"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="contact-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_STATUSES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormRow>
      <FormRow id="contact-org" label="Organization" optional error={errors.organization_id?.message}>
        <Controller
          control={control}
          name="organization_id"
          render={({ field }) => (
            <RecordPicker
              id="contact-org"
              value={field.value}
              onChange={field.onChange}
              options={orgOptions}
              placeholder="No organization"
              noneLabel="No organization"
              searchPlaceholder="Search organizations"
            />
          )}
        />
      </FormRow>
      <FormRow id="contact-title" label="Job title" optional>
        <Input id="contact-title" {...register('job_title')} />
      </FormRow>
      <FormRow id="contact-email" label="Email" optional error={errors.email?.message}>
        <Input id="contact-email" type="email" aria-invalid={!!errors.email} {...register('email')} />
      </FormRow>
      <FormRow id="contact-phone" label="Phone" optional>
        <Input id="contact-phone" type="tel" {...register('phone')} />
      </FormRow>
      {formError ? <p className="text-[13px] text-raspberry-ink">{formError}</p> : null}
      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={formState.isSubmitting}>
          {contact ? 'Save' : 'Add contact'}
        </Button>
      </FormActions>
    </form>
  )
}
