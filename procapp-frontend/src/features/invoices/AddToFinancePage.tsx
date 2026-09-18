import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import {
  ApiError,
  batchAddToFinance,
  listAllProjects,
  listAllSuppliers,
  listInvoices,
} from '@/api/client'
import type { InvoiceWithRelations } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/data-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatCurrency } from '@/lib/format'
import { invoiceColumns } from './invoiceColumns'
import { InvoicesFilters } from './InvoicesFilters'
import { monthToRange } from './invoiceMutationHelpers'
import { StagingPanel } from './StagingPanel'

const PAGE_SIZE = 10

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function AddToFinancePage() {
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()

  const [projectFilter, setProjectFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [pageIndex, setPageIndex] = useState(0)

  const [staged, setStaged] = useState<InvoiceWithRelations[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)

  const projectsQuery = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: listAllProjects,
  })
  const suppliersQuery = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: listAllSuppliers,
  })

  const projectOptions = useMemo(
    () => (projectsQuery.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
    [projectsQuery.data],
  )
  const supplierOptions = useMemo(
    () => (suppliersQuery.data ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    [suppliersQuery.data],
  )

  const monthRange = monthToRange(monthFilter)
  const stagedIds = useMemo(() => new Set(staged.map((invoice) => invoice.id)), [staged])

  const eligibleQuery = useQuery({
    queryKey: [
      'invoices',
      'eligible-for-finance',
      { projectFilter, supplierFilter, monthRange, debouncedSearch, pageIndex },
    ],
    queryFn: () =>
      listInvoices({
        hasListNo: false,
        financeSubmitted: false,
        projectId: projectFilter ? Number(projectFilter) : undefined,
        supplierId: supplierFilter ? Number(supplierFilter) : undefined,
        receivedDateFrom: monthRange?.from,
        receivedDateTo: monthRange?.to,
        search: debouncedSearch || undefined,
        page: pageIndex,
        size: PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  })

  const visibleEligible = (eligibleQuery.data?.content ?? []).filter(
    (invoice) => !stagedIds.has(invoice.id),
  )

  function addToStaging(invoice: InvoiceWithRelations) {
    setStaged((prev) => (prev.some((item) => item.id === invoice.id) ? prev : [...prev, invoice]))
  }

  function removeFromStaging(id: number) {
    setStaged((prev) => prev.filter((item) => item.id !== id))
  }

  const submitBatchMutation = useMutation({
    mutationFn: () =>
      batchAddToFinance(
        staged.map((invoice) => invoice.id),
        { financeSubmitDate: todayIsoDate(), updatedByUserId: currentUser!.id },
      ),
    onSuccess: (updated) => {
      // Every invoice in a batch shares one listNo - this is what "Add to Finance" produces.
      const listNo = updated[0]?.listNo
      toast.success(
        `${updated.length} invoice${updated.length === 1 ? '' : 's'} added to finance`,
        {
          description: listNo ? `List No: ${listNo}` : undefined,
        },
      )
      setStaged([])
      setConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : 'Could not submit the batch.')
    },
  })

  const stagedTotal = staged.reduce((sum, invoice) => sum + invoice.value, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add to Finance"
        description="Batch invoices that have a GRN into the finance submission queue."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Eligible Invoices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InvoicesFilters
                projectOptions={projectOptions}
                supplierOptions={supplierOptions}
                projectId={projectFilter}
                onProjectIdChange={(value) => {
                  setProjectFilter(value)
                  setPageIndex(0)
                }}
                supplierId={supplierFilter}
                onSupplierIdChange={(value) => {
                  setSupplierFilter(value)
                  setPageIndex(0)
                }}
                month={monthFilter}
                onMonthChange={(value) => {
                  setMonthFilter(value)
                  setPageIndex(0)
                }}
              />

              <DataTable
                columns={invoiceColumns}
                data={visibleEligible}
                rowCount={eligibleQuery.data?.totalElements ?? 0}
                pageIndex={pageIndex}
                pageSize={PAGE_SIZE}
                onPageChange={setPageIndex}
                searchValue={search}
                onSearchChange={(value) => {
                  setSearch(value)
                  setPageIndex(0)
                }}
                searchPlaceholder="Search invoice #, PO number…"
                getRowId={(row) => String(row.id)}
                isLoading={eligibleQuery.isLoading}
                isError={eligibleQuery.isError}
                emptyMessage="No invoices are waiting to be added to finance."
                rowActions={(invoice) => (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Add ${invoice.invoiceNumber} to batch`}
                    onClick={() => addToStaging(invoice)}
                  >
                    <Plus className="size-4" />
                  </Button>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Selected for This Batch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StagingPanel invoices={staged} onRemove={removeFromStaging} />
              <Button
                type="button"
                className="w-full"
                disabled={staged.length === 0}
                onClick={() => setConfirmOpen(true)}
              >
                Submit Batch
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Submit this batch to finance?"
        description={`${staged.length} invoice${staged.length === 1 ? '' : 's'} totalling ${formatCurrency(stagedTotal)} will be assigned a finance list number dated today. This cannot be undone from here.`}
        confirmLabel="Submit Batch"
        variant="default"
        onConfirm={async () => {
          await submitBatchMutation.mutateAsync()
        }}
      />
    </div>
  )
}
