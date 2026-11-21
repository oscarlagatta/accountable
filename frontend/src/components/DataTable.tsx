import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, Pencil, Search, Trash2 } from 'lucide-react'
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Search is a plain filter on precomputed row text (below); the table sorts.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
})

type Value = string | number | boolean | null | undefined

export type Column<T> = {
  id: string
  header: string
  /** The value used to sort, and to search when it's text. */
  value: (row: T) => Value
  /** What the cell shows; defaults to the value. */
  cell?: (row: T) => ReactNode
  /** Numbers are right-aligned in mono. */
  numeric?: boolean
  /** Text columns are searched unless this is false. */
  searchable?: boolean
  /** Searched but not shown, such as a label for a column that shows a badge. */
  hidden?: boolean
  className?: string
}

/** Lowercase text of every searchable column, joined, so one includes() covers the row. */
function searchText<T>(row: T, columns: Column<T>[]) {
  return columns
    .filter((c) => c.searchable !== false && !c.numeric)
    .map((c) => c.value(row))
    .filter((v) => typeof v === 'string')
    .join('\u0000')
    .toLowerCase()
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  noun,
  rowHref,
  onEdit,
  onDelete,
  toolbar,
  searchLabel,
  initialSort,
  emptyText,
}: {
  data: T[]
  columns: Column<T>[]
  /** Plural, lowercase: "contacts". */
  noun: string
  rowHref: (row: T) => string
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  /** Filters and the Add button, to the right of the search box. */
  toolbar?: ReactNode
  searchLabel?: string
  initialSort?: SortingState
  emptyText?: ReactNode
}) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? [{ id: columns[0].id, desc: false }])

  // Rows carry their search text, worked out once per data change rather than on every keystroke.
  const rows = useMemo(() => data.map((row) => ({ row, text: searchText(row, columns) })), [data, columns])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? rows.filter((r) => r.text.includes(q)) : rows
  }, [rows, search])

  const defs = useMemo<ColumnDef<typeof features, { row: T; text: string }>[]>(
    () =>
      columns.map((c) => ({
        id: c.id,
        header: c.header,
        accessorFn: (r: { row: T }) => {
          const v = c.value(r.row)
          return typeof v === 'string' ? (v ? v.toLowerCase() : undefined) : (v ?? undefined)
        },
        sortFn: c.numeric ? 'basic' : 'alphanumeric',
        sortUndefined: 'last',
        sortDescFirst: false,
      })),
    [columns],
  )

  const table = useTable({
    features,
    columns: defs,
    data: filtered,
    state: { sorting },
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getRowId: (r) => String(r.row.id),
  })

  const hasActions = Boolean(onEdit || onDelete)
  const visible = table.getRowModel().rows

  function stop(e: MouseEvent) {
    e.stopPropagation()
  }

  return (
    <section className="rounded-lg bg-panel shadow-panel">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-3">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <Input
            type="search"
            aria-label={searchLabel ?? `Search ${noun}`}
            placeholder={searchLabel ?? `Search ${noun}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">{toolbar}</div>
      </div>
      <div className="overflow-x-auto px-3 pb-3">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const col = columns.find((c) => c.id === header.column.id)!
                  if (col.hidden) return null
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none'}
                      className={cn(
                        'h-9 px-2 text-xs font-medium whitespace-nowrap text-ink-muted',
                        col.numeric ? 'text-right' : 'text-left',
                      )}
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-sm hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                          sorted && 'text-ink',
                        )}
                      >
                        {col.header}
                        {sorted === 'asc' ? <ArrowUp className="size-3.5" aria-label="sorted ascending" /> : null}
                        {sorted === 'desc' ? <ArrowDown className="size-3.5" aria-label="sorted descending" /> : null}
                      </button>
                    </th>
                  )
                })}
                {hasActions ? <th className="w-20 px-2" aria-label="Actions" /> : null}
              </tr>
            ))}
          </thead>
          <tbody>
            {visible.map((r) => {
              const row = r.original.row
              return (
                <tr
                  key={r.id}
                  onClick={() => navigate(rowHref(row))}
                  className="group h-11 cursor-pointer border-t border-line hover:bg-hover"
                >
                  {columns
                    .filter((c) => !c.hidden)
                    .map((c) => (
                      <td
                        key={c.id}
                        className={cn(
                          'px-2 py-1.5 whitespace-nowrap',
                          c.numeric && 'text-right font-mono tabular-nums',
                          c.className,
                        )}
                      >
                        {c.cell ? c.cell(row) : (c.value(row) ?? '')}
                      </td>
                    ))}
                  {hasActions ? (
                    <td className="px-2 text-right whitespace-nowrap" onClick={stop}>
                      <div className="inline-flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        {onEdit ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${rowLabel(row)}`}
                            onClick={() => onEdit(row)}
                          >
                            <Pencil />
                          </Button>
                        ) : null}
                        {onDelete ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${rowLabel(row)}`}
                            className="hover:bg-raspberry/10 hover:text-raspberry-ink"
                            onClick={() => onDelete(row)}
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              )
            })}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 border-t border-line py-12 text-sm text-ink-muted">
            {search.trim() ? (
              <>
                <p>
                  No {noun} match "{search.trim()}"
                </p>
                <Button variant="secondary" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              </>
            ) : (
              <p>{emptyText ?? `No ${noun} yet.`}</p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function rowLabel(row: unknown): string {
  const r = row as { name?: string }
  return r.name ?? 'row'
}

/** A linked record name inside a table cell: a real link that doesn't also open the row. */
export function stopRowClick(e: MouseEvent) {
  e.stopPropagation()
}
