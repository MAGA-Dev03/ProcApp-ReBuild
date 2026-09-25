import { type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  getRowId?: (row: TData) => string

  /** Server-side pagination - all rows across all pages, not just the current page's count. */
  rowCount: number
  pageIndex: number
  pageSize: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]

  /** Server-side sorting. */
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void

  /** Global search box. */
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string

  /** Per-column filter controls, rendered next to the search box. */
  filterSlot?: ReactNode

  /** Row-level action buttons (edit/delete/custom), rendered in a trailing column. */
  rowActions?: (row: TData) => ReactNode

  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  emptyMessage?: string
}

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  rowCount,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  sorting = [],
  onSortingChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filterSlot,
  rowActions,
  isLoading,
  isError,
  errorMessage = 'Something went wrong while loading data.',
  emptyMessage = 'No results found.',
}: DataTableProps<TData>) {
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize))

  const tableColumns: ColumnDef<TData, unknown>[] = rowActions
    ? [
        ...columns,
        {
          id: '__actions',
          header: '',
          enableSorting: false,
          cell: ({ row }) => (
            <div className="flex justify-end gap-1">{rowActions(row.original)}</div>
          ),
        },
      ]
    : columns

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    onSortingChange?.(next)
  }

  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    enableSortingRemoval: true,
    pageCount,
    state: {
      pagination: { pageIndex, pageSize },
      sorting,
    },
    onSortingChange: handleSortingChange,
  })

  const columnCount = tableColumns.length

  return (
    <div className="space-y-4">
      {(onSearchChange || filterSlot) && (
        <div className="flex flex-wrap items-center gap-2">
          {onSearchChange && (
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder={searchPlaceholder}
                value={searchValue ?? ''}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </div>
          )}
          {filterSlot}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDirection = header.column.getIsSorted()

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 font-medium select-none hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDirection === 'asc' ? (
                            <ArrowUp className="size-3.5" />
                          ) : sortDirection === 'desc' ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize > 8 ? 8 : pageSize }).map((_, rowIndex) => (
                <TableRow key={`skeleton-${rowIndex}`}>
                  {Array.from({ length: columnCount }).map((__, colIndex) => (
                    <TableCell key={`skeleton-cell-${colIndex}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-destructive">
                  {errorMessage}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {rowCount} {rowCount === 1 ? 'row' : 'rows'}
        </div>
        <div className="flex items-center gap-3">
          {onPageSizeChange && (
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageIndex <= 0 || isLoading}
              onClick={() => onPageChange(pageIndex - 1)}
            >
              Previous
            </Button>
            <span className={cn('px-2 text-sm text-muted-foreground')}>
              Page {pageIndex + 1} of {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageIndex >= pageCount - 1 || isLoading}
              onClick={() => onPageChange(pageIndex + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
