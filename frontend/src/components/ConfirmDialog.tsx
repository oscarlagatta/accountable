import { useQuery } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

type Preview = { name: string }

/**
 * Delete confirmation. It loads the delete preview when it opens and says what will happen
 * to the linked records, with counts.
 */
export function ConfirmDialog<P extends Preview>({
  open,
  onOpenChange,
  previewKey,
  loadPreview,
  consequences,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  previewKey: readonly unknown[]
  loadPreview: () => Promise<P>
  consequences: (preview: P) => string[]
  onConfirm: () => Promise<unknown>
}) {
  const [busy, setBusy] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Once Delete is pressed the record may be gone, so the preview is never fetched again while
  // this dialog is open: a refetch would ask the server about a record that no longer exists.
  const preview = useQuery({
    queryKey: [...previewKey, 'delete-preview'],
    queryFn: loadPreview,
    enabled: open && !busy && !deleted,
    staleTime: 0,
    gcTime: 0,
  })
  // Keep showing the last preview while the dialog closes, after the cache entry is gone.
  const last = useRef<P | undefined>(undefined)
  if (preview.data) last.current = preview.data
  const shown = preview.data ?? last.current
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDeleted(false)
  }

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      setDeleted(true)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The delete failed.')
    } finally {
      setBusy(false)
    }
  }

  const lines = shown ? consequences(shown) : []

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="p-6 sm:max-w-md">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-lg font-semibold text-ink">
            {shown ? `Delete ${shown.name}?` : 'Delete?'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1 text-sm text-ink-muted">
              {preview.isLoading ? <p>Checking linked records…</p> : null}
              {preview.isError ? <p className="text-raspberry-ink">Couldn't check linked records.</p> : null}
              {lines.map((l) => (
                <p key={l}>{l}</p>
              ))}
              <p>This can't be undone.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-sm text-raspberry-ink">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel variant="secondary">Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={busy || deleted || !shown}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function plural(n: number, one: string, many: string = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}
