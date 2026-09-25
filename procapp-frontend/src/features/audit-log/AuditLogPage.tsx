import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { listAllUsers, listInvoiceAuditLog } from '@/api/client'
import type { AuditLogAction, AuditLogEntry } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { AuditLogDetailDialog } from './AuditLogDetailDialog'
import { AuditLogFilters, type AuditLogFiltersValue } from './AuditLogFilters'
import { auditLogColumns } from './auditLogColumns'

const PAGE_SIZE = 20

const EMPTY_FILTERS: AuditLogFiltersValue = {
  action: '',
  performedByUserId: '',
  dateFrom: '',
  dateTo: '',
}

export function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFiltersValue>(EMPTY_FILTERS)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [pageIndex, setPageIndex] = useState(0)
  const [detailEntry, setDetailEntry] = useState<AuditLogEntry | null>(null)

  const usersQuery = useQuery({
    queryKey: ['users', 'all'],
    queryFn: listAllUsers,
  })
  const userOptions = useMemo(
    () => (usersQuery.data ?? []).map((u) => ({ value: String(u.id), label: u.name })),
    [usersQuery.data],
  )

  const auditLogQuery = useQuery({
    queryKey: ['audit-log', 'invoices', { filters, debouncedSearch, pageIndex }],
    queryFn: () =>
      listInvoiceAuditLog({
        action: (filters.action as AuditLogAction) || undefined,
        performedByUserId: filters.performedByUserId ? Number(filters.performedByUserId) : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        search: debouncedSearch || undefined,
        page: pageIndex,
        size: PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Every change made to an invoice - who did what, and when. Append-only; nothing here can be edited or deleted."
      />

      <div className="space-y-4">
        <AuditLogFilters
          value={filters}
          onChange={(next) => {
            setFilters(next)
            setPageIndex(0)
          }}
          userOptions={userOptions}
        />

        <DataTable
          columns={auditLogColumns}
          data={auditLogQuery.data?.content ?? []}
          rowCount={auditLogQuery.data?.totalElements ?? 0}
          pageIndex={pageIndex}
          pageSize={PAGE_SIZE}
          onPageChange={setPageIndex}
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value)
            setPageIndex(0)
          }}
          searchPlaceholder="Search invoice number…"
          getRowId={(row) => String(row.id)}
          isLoading={auditLogQuery.isLoading}
          isError={auditLogQuery.isError}
          emptyMessage="No audit log entries match these filters."
          rowActions={(entry) => (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`View details for entry ${entry.id}`}
              onClick={() => setDetailEntry(entry)}
            >
              <Eye className="size-4" />
            </Button>
          )}
        />
      </div>

      <AuditLogDetailDialog entry={detailEntry} onOpenChange={(open) => !open && setDetailEntry(null)} />
    </div>
  )
}
