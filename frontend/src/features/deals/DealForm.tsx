import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { FormActions, FormRow, applyServerErrors } from '@/components/form'
import { RecordPicker, type PickerOption } from '@/components/RecordPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useContacts, type ContactRow } from '@/features/contacts/api'
import { useOrganizations } from '@/features/organizations/api'
import { useSaveDeal, useStages, type Deal, type DealInput, type Stage } from './api'
import type { StageKey } from './stages'

export const dealSchema = z.object({
  name: z.string().trim().min(1, 'Required'),
  organization_id: z.string().nullable(),
  contact_id: z.string().nullable(),
  stage: z.enum(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  value: z.string().trim().min(1, 'Required').regex(/^\d+$/, 'Enter whole dollars, 0 or more'),
  probability: z
    .string()
    .trim()
    .min(1, 'Required')
    .regex(/^\d+$/, 'Enter a whole number from 0 to 100')
    .refine((v) => Number(v) <= 100, 'Enter a whole number from 0 to 100'),
  close_date: z.string().min(1, 'Required'),
})
type Values = z.infer<typeof dealSchema>

/** The organization's contacts first, then everyone else (Concerns 11). */
export function contactOptions(contacts: ContactRow[], organizationId: number | null): PickerOption[] {
  const option = (c: ContactRow, group: string): PickerOption => ({
    value: String(c.id),
    label: c.name,
    detail: c.organization_name,
    group,
  })
  if (organizationId === null) return contacts.map((c) => option(c, ''))
  const at = contacts.filter((c) => c.organization_id === organizationId)
  const rest = contacts.filter((c) => c.organization_id !== organizationId)
  const orgName = at[0]?.organization_name ?? 'This organization'
  return [...at.map((c) => option(c, `At ${orgName}`)), ...rest.map((c) => option(c, 'Everyone else'))]
}

function probabilityFor(stages: Stage[] | undefined, key: string) {
  return stages?.find((s) => s.key === key)?.probability
}

type Defaults = { stage?: StageKey; organization_id?: number | null; contact_id?: number | null }

const toField = (n: number | null | undefined) => (n === null || n === undefined ? null : String(n))

/** The form's starting values: the deal being edited, or a new deal with the given defaults. */
function initialStageOf(deal: Deal | undefined, defaults: Defaults | undefined): StageKey {
  return deal?.stage ?? defaults?.stage ?? 'new'
}

function initialProbability(deal: Deal | undefined, stages: Stage[] | undefined, stage: StageKey) {
  const probability = deal?.probability ?? probabilityFor(stages, stage)
  return probability === undefined ? '' : String(probability)
}

function initialValues(deal: Deal | undefined, defaults: Defaults | undefined, stages: Stage[] | undefined): Values {
  const stage = initialStageOf(deal, defaults)
  return {
    name: deal?.name ?? '',
    organization_id: toField(deal ? deal.organization_id : defaults?.organization_id),
    contact_id: toField(deal ? deal.contact_id : defaults?.contact_id),
    stage,
    value: deal ? String(deal.value) : '',
    probability: initialProbability(deal, stages, stage),
    close_date: deal?.close_date ?? '',
  }
}

function toInput(v: Values): DealInput {
  return {
    name: v.name,
    organization_id: v.organization_id ? Number(v.organization_id) : null,
    contact_id: v.contact_id ? Number(v.contact_id) : null,
    stage: v.stage,
    value: Number(v.value),
    probability: Number(v.probability),
    close_date: v.close_date,
  }
}

export function DealForm({
  deal,
  defaults,
  lockStage = false,
  onSaved,
  onCancel,
}: {
  deal?: Deal
  defaults?: Defaults
  /** Adding from a pipeline column: the stage is that column's. */
  lockStage?: boolean
  onSaved: (d: Deal) => void
  onCancel: () => void
}) {
  const save = useSaveDeal()
  const stages = useStages()
  const orgs = useOrganizations()
  const contacts = useContacts()
  const [formError, setFormError] = useState<string | null>(null)
  const initialStage = initialStageOf(deal, defaults)

  const { register, handleSubmit, setError, setValue, setFocus, control, formState } = useForm<Values>({
    resolver: zodResolver(dealSchema),
    defaultValues: initialValues(deal, defaults, stages.data),
  })
  // The name field takes focus when the form opens.
  useEffect(() => setFocus('name'), [setFocus])
  const errors = formState.errors
  const orgId = useWatch({ control, name: 'organization_id' })
  const probability = useWatch({ control, name: 'probability' })

  // The stage list can arrive after the form opens; fill the probability once it does.
  // Only once: a field the user clears must stay clear.
  const filled = useRef(probability !== '')
  useEffect(() => {
    if (filled.current || !stages.data) return
    filled.current = true
    const p = probabilityFor(stages.data, initialStage)
    if (p !== undefined) setValue('probability', String(p))
  }, [stages.data, initialStage, setValue])

  const orgOptions = useMemo(
    () => (orgs.data ?? []).map((o) => ({ value: String(o.id), label: o.name, detail: o.industry })),
    [orgs.data],
  )
  const peopleOptions = useMemo(
    () => contactOptions(contacts.data ?? [], orgId ? Number(orgId) : null),
    [contacts.data, orgId],
  )

  async function onSubmit(v: Values) {
    setFormError(null)
    const data = toInput(v)
    try {
      onSaved(await save.mutateAsync({ id: deal?.id, data }))
    } catch (e) {
      setFormError(applyServerErrors(e, setError, Object.keys(data)))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <FormRow id="deal-name" label="Name" error={errors.name?.message}>
        <Input id="deal-name" aria-invalid={!!errors.name} {...register('name')} />
      </FormRow>
      <FormRow id="deal-org" label="Organization" optional>
        <Controller
          control={control}
          name="organization_id"
          render={({ field }) => (
            <RecordPicker
              id="deal-org"
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
      <FormRow id="deal-contact" label="Main contact" optional>
        <Controller
          control={control}
          name="contact_id"
          render={({ field }) => (
            <RecordPicker
              id="deal-contact"
              value={field.value}
              onChange={field.onChange}
              options={peopleOptions}
              placeholder="No main contact"
              noneLabel="No main contact"
              searchPlaceholder="Search contacts"
            />
          )}
        />
      </FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow id="deal-stage" label="Stage">
          <Controller
            control={control}
            name="stage"
            render={({ field }) => (
              <Select
                value={field.value}
                disabled={lockStage}
                onValueChange={(key) => {
                  field.onChange(key)
                  const p = probabilityFor(stages.data, key)
                  if (p !== undefined) setValue('probability', String(p), { shouldValidate: true })
                }}
              >
                <SelectTrigger id="deal-stage" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(stages.data ?? []).map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormRow>
        <FormRow id="deal-probability" label="Probability (%)" error={errors.probability?.message}>
          <Input
            id="deal-probability"
            inputMode="numeric"
            className="font-mono"
            aria-invalid={!!errors.probability}
            {...register('probability')}
          />
        </FormRow>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormRow id="deal-value" label="Value ($)" error={errors.value?.message}>
          <Input
            id="deal-value"
            inputMode="numeric"
            className="font-mono"
            placeholder="45000"
            aria-invalid={!!errors.value}
            {...register('value')}
          />
        </FormRow>
        <FormRow id="deal-close" label="Close date" error={errors.close_date?.message}>
          <Input
            id="deal-close"
            type="date"
            className="font-mono"
            min="2000-01-01"
            aria-invalid={!!errors.close_date}
            {...register('close_date')}
          />
        </FormRow>
      </div>
      {formError ? <p className="text-[13px] text-raspberry-ink">{formError}</p> : null}
      <FormActions>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={formState.isSubmitting}>
          {deal ? 'Save' : 'Add deal'}
        </Button>
      </FormActions>
    </form>
  )
}
