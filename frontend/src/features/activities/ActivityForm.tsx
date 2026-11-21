import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormRow, applyServerErrors } from '@/components/form'
import { RecordPicker, type PickerOption } from '@/components/RecordPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useContacts } from '@/features/contacts/api'
import { useDeals } from '@/features/deals/api'
import { toLocalInput } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  ACTIVITY_KINDS,
  useLogActivity,
  useUpdateActivity,
  type ActivityKind,
  type TimelineEntry,
  type TimelineOwner,
} from './api'

export const activitySchema = z
  .object({
    target: z.string().nullable(),
    needsTarget: z.boolean(),
    kind: z.enum(['note', 'call', 'email']),
    description: z.string().trim().min(1, 'Required'),
    occurred_at: z.string().min(1, 'Required'),
    follow_up_date: z.string(),
  })
  .refine((v) => !v.needsTarget || Boolean(v.target), { path: ['target'], message: 'Choose a contact or a deal' })
type Values = z.infer<typeof activitySchema>

function TargetPicker({
  value,
  onChange,
  invalid,
}: {
  value: string | null
  onChange: (v: string | null) => void
  invalid: boolean
}) {
  const contacts = useContacts()
  const deals = useDeals()
  const options = useMemo<PickerOption[]>(
    () => [
      ...(contacts.data ?? []).map((c) => ({
        value: `contact:${c.id}`,
        label: c.name,
        detail: c.organization_name,
        group: 'Contacts',
      })),
      ...(deals.data ?? []).map((d) => ({
        value: `deal:${d.id}`,
        label: d.name,
        detail: d.organization_name,
        group: 'Deals',
      })),
    ],
    [contacts.data, deals.data],
  )
  return (
    <RecordPicker
      id="activity-target"
      value={value}
      onChange={onChange}
      options={options}
      invalid={invalid}
      placeholder="Choose a contact or a deal"
      searchPlaceholder="Search contacts and deals"
    />
  )
}

/**
 * One form for logging and editing an activity. On a contact or deal page it logs against that
 * record; on the dashboard (`pickTarget`) it starts with a contact-or-deal picker (Concerns 14).
 */
export function ActivityForm({
  owner,
  pickTarget = false,
  activity,
  onDone,
  onCancel,
  compact = false,
}: {
  owner?: TimelineOwner
  pickTarget?: boolean
  activity?: TimelineEntry
  onDone?: () => void
  onCancel?: () => void
  compact?: boolean
}) {
  const log = useLogActivity()
  const update = useUpdateActivity()
  const [formError, setFormError] = useState<string | null>(null)
  const defaults = (): Values => ({
    target: null,
    needsTarget: pickTarget,
    kind: (activity?.kind as ActivityKind | undefined) ?? 'note',
    description: activity?.description ?? '',
    occurred_at: toLocalInput(activity?.occurred_at ?? new Date()),
    follow_up_date: activity?.follow_up_date ?? '',
  })
  const { register, handleSubmit, control, reset, setError, formState } = useForm<Values>({
    resolver: zodResolver(activitySchema),
    defaultValues: defaults(),
  })
  const errors = formState.errors
  const idp = activity ? `activity-${activity.id}` : 'activity'

  async function onSubmit(v: Values) {
    setFormError(null)
    const common = {
      kind: v.kind,
      description: v.description,
      occurred_at: v.occurred_at.length === 16 ? `${v.occurred_at}:00` : v.occurred_at,
      follow_up_date: v.follow_up_date || null,
    }
    try {
      if (activity) {
        await update.mutateAsync({ id: activity.id, data: common })
        toast.success('Activity saved')
      } else {
        let target: { contact_id?: number; deal_id?: number }
        if (pickTarget) {
          const [kind, id] = (v.target ?? '').split(':')
          target = kind === 'deal' ? { deal_id: Number(id) } : { contact_id: Number(id) }
        } else {
          target = owner!.kind === 'deal' ? { deal_id: owner!.id } : { contact_id: owner!.id }
        }
        await log.mutateAsync({ ...common, ...target })
        toast.success(v.follow_up_date ? 'Activity and follow-up logged' : 'Activity logged')
        reset(defaults())
      }
      onDone?.()
    } catch (e) {
      setFormError(applyServerErrors(e, setError, ['kind', 'description', 'occurred_at', 'follow_up_date']))
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-3"
      aria-label={activity ? 'Edit activity' : 'Log activity'}
    >
      {pickTarget ? (
        <FormRow id="activity-target" label="On" error={errors.target?.message}>
          <Controller
            control={control}
            name="target"
            render={({ field }) => (
              <TargetPicker value={field.value} onChange={field.onChange} invalid={!!errors.target} />
            )}
          />
        </FormRow>
      ) : null}
      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <div role="radiogroup" aria-label="Type" className="inline-flex w-fit gap-1 rounded-md bg-page p-1">
            {ACTIVITY_KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                role="radio"
                aria-checked={field.value === k.key}
                onClick={() => field.onChange(k.key)}
                className={cn(
                  'rounded-sm px-3 py-1 text-[13px] font-medium text-ink-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  field.value === k.key && 'bg-panel text-ink shadow-panel',
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
        )}
      />
      <FormRow id={`${idp}-description`} label="What happened" error={errors.description?.message}>
        <Textarea
          id={`${idp}-description`}
          rows={compact ? 2 : 3}
          placeholder="Called about the renewal"
          aria-invalid={!!errors.description}
          {...register('description')}
        />
      </FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow id={`${idp}-when`} label="When" error={errors.occurred_at?.message}>
          <Input
            id={`${idp}-when`}
            type="datetime-local"
            className="font-mono text-[13px]"
            {...register('occurred_at')}
          />
        </FormRow>
        <FormRow id={`${idp}-follow-up`} label="Follow-up date" optional>
          <Input
            id={`${idp}-follow-up`}
            type="date"
            className="font-mono text-[13px]"
            {...register('follow_up_date')}
          />
        </FormRow>
      </div>
      {formError ? <p className="text-[13px] text-raspberry-ink">{formError}</p> : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={formState.isSubmitting}>
          {activity ? 'Save' : 'Log activity'}
        </Button>
      </div>
    </form>
  )
}
