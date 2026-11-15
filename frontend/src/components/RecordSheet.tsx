import type { ReactNode } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

/** The 440px side panel that holds add and edit forms, so the table stays in view. */
export function RecordSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] gap-0 sm:max-w-[440px]">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="text-lg font-semibold text-ink">{title}</SheetTitle>
          <SheetDescription className={description ? '' : 'sr-only'}>{description ?? title}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
