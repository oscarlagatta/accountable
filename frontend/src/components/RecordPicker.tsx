import { Check, ChevronsUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type PickerOption = { value: string; label: string; detail?: string | null; group?: string }

/**
 * A searchable picker for a linked record (organization, contact, deal). Options keep their order,
 * and are shown under their group headings in the order the groups first appear.
 */
export function RecordPicker({
  id,
  value,
  onChange,
  options,
  placeholder,
  noneLabel,
  invalid,
  searchPlaceholder = 'Search',
}: {
  id: string
  value: string | null
  onChange: (value: string | null) => void
  options: PickerOption[]
  placeholder: string
  /** When set, offers a choice that clears the value. */
  noneLabel?: string
  invalid?: boolean
  searchPlaceholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const groups = useMemo(() => {
    const out: { name: string; items: PickerOption[] }[] = []
    for (const o of options) {
      const name = o.group ?? ''
      let g = out.find((x) => x.name === name)
      if (!g) out.push((g = { name, items: [] }))
      g.items.push(o)
    }
    return out
  }, [options])

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className={cn('h-9 w-full justify-between rounded-md bg-panel px-3 font-normal', !selected && 'text-ink-muted')}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No matches</CommandEmpty>
            {noneLabel ? (
              <CommandGroup>
                <CommandItem
                  value={`__none ${noneLabel}`}
                  onSelect={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                >
                  <Check className={cn('size-4', value === null ? 'opacity-100' : 'opacity-0')} />
                  <span className="text-ink-muted">{noneLabel}</span>
                </CommandItem>
              </CommandGroup>
            ) : null}
            {groups.map((g) => (
              <CommandGroup key={g.name || 'all'} heading={g.name || undefined}>
                {g.items.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={`${o.label} ${o.detail ?? ''} ${o.value}`}
                    onSelect={() => {
                      onChange(o.value)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn('size-4', o.value === value ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{o.label}</span>
                    {o.detail ? <span className="ml-auto truncate text-xs text-ink-muted">{o.detail}</span> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
