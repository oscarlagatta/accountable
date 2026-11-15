import type { ReactNode } from 'react'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { ApiError } from '@/lib/api'

/** A labelled field with its error underneath, in darkened Raspberry. */
export function FormRow({ id, label, error, children, optional }: { id: string; label: string; error?: string; children: ReactNode; optional?: boolean }) {
  return (
    <Field data-invalid={Boolean(error)} className="gap-1.5">
      <FieldLabel htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-muted">optional</span> : null}
      </FieldLabel>
      {children}
      {error ? (
        <FieldError id={`${id}-error`} className="text-[13px] text-raspberry-ink">
          {error}
        </FieldError>
      ) : null}
    </Field>
  )
}

/** Puts the server's per-field messages on the form, and returns any message that has no field. */
export function applyServerErrors(error: unknown, setError: (field: never, e: { message: string }) => void, fields: string[]): string | null {
  if (error instanceof ApiError) {
    const unplaced: string[] = []
    for (const [field, message] of Object.entries(error.fields)) {
      if (fields.includes(field)) setError(field as never, { message })
      else unplaced.push(message)
    }
    if (Object.keys(error.fields).length === 0) return error.message
    return unplaced.length ? unplaced.join(' ') : null
  }
  return error instanceof Error ? error.message : 'Something went wrong.'
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2 pt-2">{children}</div>
}
