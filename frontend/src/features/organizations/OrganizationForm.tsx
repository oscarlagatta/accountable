import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FormActions, FormRow, applyServerErrors } from '@/components/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useSaveOrganization, type Organization, type OrganizationInput } from './api'

const WEBSITE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i

export const organizationSchema = z.object({
  name: z.string().trim().min(1, 'Required'),
  website: z
    .string()
    .trim()
    .refine((v) => v === '' || WEBSITE.test(v), 'Enter a valid website, such as example.com'),
  industry: z.string().trim(),
  notes: z.string().trim(),
})
type Values = z.infer<typeof organizationSchema>

const blank = (v: string) => (v === '' ? null : v)

export function OrganizationForm({
  organization,
  onSaved,
  onCancel,
}: {
  organization?: Pick<Organization, 'id' | 'name' | 'website' | 'industry'> & { notes?: string | null }
  onSaved: (org: Organization) => void
  onCancel: () => void
}) {
  const save = useSaveOrganization()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, setError, setFocus, formState } = useForm<Values>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name ?? '',
      website: organization?.website ?? '',
      industry: organization?.industry ?? '',
      notes: organization?.notes ?? '',
    },
  })
  const errors = formState.errors
  // The name field takes focus when the form opens.
  useEffect(() => setFocus('name'), [setFocus])

  async function onSubmit(v: Values) {
    setFormError(null)
    const data: OrganizationInput = {
      name: v.name,
      website: blank(v.website),
      industry: blank(v.industry),
      notes: blank(v.notes),
    }
    try {
      onSaved(await save.mutateAsync({ id: organization?.id, data }))
    } catch (e) {
      setFormError(applyServerErrors(e, setError, Object.keys(data)))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <FormRow id="org-name" label="Name" error={errors.name?.message}>
        <Input id="org-name" aria-invalid={!!errors.name} {...register('name')} />
      </FormRow>
      <FormRow id="org-website" label="Website" optional error={errors.website?.message}>
        <Input id="org-website" placeholder="example.com" aria-invalid={!!errors.website} {...register('website')} />
      </FormRow>
      <FormRow id="org-industry" label="Industry" optional error={errors.industry?.message}>
        <Input id="org-industry" placeholder="Healthcare" {...register('industry')} />
      </FormRow>
      <FormRow id="org-notes" label="Notes" optional>
        <Textarea id="org-notes" rows={4} {...register('notes')} />
      </FormRow>
      {formError ? <p className="text-[13px] text-raspberry-ink">{formError}</p> : null}
      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={formState.isSubmitting}>
          {organization ? 'Save' : 'Add organization'}
        </Button>
      </FormActions>
    </form>
  )
}
