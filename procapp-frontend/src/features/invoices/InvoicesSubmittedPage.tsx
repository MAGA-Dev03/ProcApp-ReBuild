import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { SortingState } from '@tanstack/react-table'
import { Ban, CheckCircle2, FileCheck, Pencil, Trash2 } from 'lucide-react'
import {
  ApiError,
  activateInvoice,
  cancelInvoice,
  clearFinanceSubmission,
  deleteInvoice,
  listAllProjects,
  listAllSuppliers,
  listInvoices,
  recordGrn,
  updateInvoice,
  uploadInvoiceAttachment,
} from '@/api/client'
import type { InvoiceWithRelations } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { useAuth, useHasRole } from '@/features/auth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { computeInvoiceStatus } from '@/lib/invoiceStatus'
import { AddGrnModal, type GrnFormValues } from './AddGrnModal'
import { EditInvoiceDialog } from './EditInvoiceDialog'
import { invoiceColumns } from './invoiceColumns'
import type { InvoiceFormValues } from './invoiceFormSchema'
import { InvoicesFilters } from './InvoicesFilters'
import { monthToRange, toUpdatePayload } from './invoiceMutationHelpers'
import { toSortParam } from './sortParam'

const PAGE_SIZE = 10

export function InvoicesSubmittedPage() {
  const { currentUser } = useAuth()
  const isProcurementManager = useHasRole('PROCUREMENT_MANAGER')
  const queryClient = useQueryClient()

  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithRelations | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InvoiceWithRelations | null>(null)
  const [grnTarget, setGrnTarget] = useState<InvoiceWithRelations | null>(null)

  const [projectFilter, setProjectFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'receivedDate', desc: true }])
  const [pageIndex, setPageIndex] = useState(0)

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

  const invoicesQuery = useQuery({
    queryKey: [
      'invoices',
      'submitted-to-finance',
      { projectFilter, supplierFilter, monthRange, debouncedSearch, sorting, pageIndex },
    ],
    queryFn: () =>
      listInvoices({
        // Both flags are checked for correctness even though they're always set together today.
        financeSubmitted: true,
        hasListNo: true,
        projectId: projectFilter ? Number(projectFilter) : undefined,
        supplierId: supplierFilter ? Number(supplierFilter) : undefined,
        receivedDateFrom: monthRange?.from,
        receivedDateTo: monthRange?.to,
        search: debouncedSearch || undefined,
        sort: toSortParam(sorting),
        page: pageIndex,
        size: PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  })

  function invalidateInvoices() {
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
  }

  function showMutationError(err: unknown, fallback: string) {
    toast.error(err instanceof ApiError ? err.message : fallback)
  }

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
      attachmentRemoved,
    }: {
      id: number
      values: InvoiceFormValues
      attachmentRemoved: boolean
    }) => {
      const updated = await updateInvoice(
        id,
        toUpdatePayload(values, currentUser!.id, attachmentRemoved),
      )
      if (values.attachment) {
        await uploadInvoiceAttachment(id, values.attachment)
      }
      return updated
    },
    onSuccess: () => {
      invalidateInvoices()
      setEditingInvoice(null)
    },
  })

  const clearFinanceMutation = useMutation({
    mutationFn: (id: number) => clearFinanceSubmission(id, currentUser!.id),
    onSuccess: invalidateInvoices,
    onError: (err) =>
      showMutationError(err, 'Could not clear the invoice from finance. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteInvoice(id),
    onSuccess: invalidateInvoices,
    onError: (err) => showMutationError(err, 'Could not delete the invoice. Please try again.'),
  })

  const recordGrnMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: GrnFormValues }) =>
      recordGrn(id, { ...values, updatedByUserId: currentUser!.id }),
    onSuccess: () => {
      invalidateInvoices()
      setGrnTarget(null)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelInvoice(id, currentUser!.id),
    onSuccess: invalidateInvoices,
    onError: (err) => showMutationError(err, 'Could not cancel the invoice. Please try again.'),
  })

  const activateMutation = useMutation({
    mutationFn: (id: number) => activateInvoice(id, currentUser!.id),
    onSuccess: invalidateInvoices,
    onError: (err) => showMutationError(err, 'Could not activate the invoice. Please try again.'),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submitted Invoices"
        description="Invoices already submitted to finance (list number assigned)."
      />

      <div className="space-y-4">
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
          data={invoicesQuery.data?.content ?? []}
          rowCount={invoicesQuery.data?.totalElements ?? 0}
          pageIndex={pageIndex}
          pageSize={PAGE_SIZE}
          onPageChange={setPageIndex}
          sorting={sorting}
          onSortingChange={(value) => {
            setSorting(value)
            setPageIndex(0)
          }}
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value)
            setPageIndex(0)
          }}
          searchPlaceholder="Search invoice #, PO number…"
          getRowId={(row) => String(row.id)}
          isLoading={invoicesQuery.isLoading}
          isError={invoicesQuery.isError}
          emptyMessage="No invoices have been submitted to finance yet."
          rowActions={(invoice) => {
            const status = computeInvoiceStatus(invoice)
            const grnComplete = status === 'GRN_RECEIVED' || status === 'SUBMITTED'
            return (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${invoice.invoiceNumber}`}
                  onClick={() => setEditingInvoice(invoice)}
                >
                  <Pencil className="size-4" />
                </Button>
                {!grnComplete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Add GRN for ${invoice.invoiceNumber}`}
                    onClick={() => setGrnTarget(invoice)}
                  >
                    <FileCheck className="size-4" />
                  </Button>
                )}
                {isProcurementManager &&
                  (invoice.active ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Cancel ${invoice.invoiceNumber}`}
                      onClick={() => cancelMutation.mutate(invoice.id)}
                    >
                      <Ban className="size-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Activate ${invoice.invoiceNumber}`}
                      onClick={() => activateMutation.mutate(invoice.id)}
                    >
                      <CheckCircle2 className="size-4" />
                    </Button>
                  ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${invoice.invoiceNumber}`}
                  onClick={() => setDeleteTarget(invoice)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )
          }}
        />
      </div>

      <EditInvoiceDialog
        invoice={editingInvoice}
        projectOptions={projectOptions}
        supplierOptions={supplierOptions}
        onOpenChange={(open) => !open && setEditingInvoice(null)}
        isSubmitting={updateMutation.isPending}
        onSubmit={async (values, attachmentRemoved) => {
          if (editingInvoice) {
            await updateMutation.mutateAsync({ id: editingInvoice.id, values, attachmentRemoved })
          }
        }}
        onClearFromFinance={async () => {
          if (editingInvoice) await clearFinanceMutation.mutateAsync(editingInvoice.id)
        }}
        isClearingFromFinance={clearFinanceMutation.isPending}
        readOnly={
          editingInvoice
            ? ['SUBMITTED', 'CANCELLED'].includes(computeInvoiceStatus(editingInvoice))
            : false
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.invoiceNumber}?`}
        description="This permanently removes the invoice. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.id)
        }}
      />

      <AddGrnModal
        invoice={grnTarget}
        onOpenChange={(open) => !open && setGrnTarget(null)}
        isSubmitting={recordGrnMutation.isPending}
        onSubmit={async (values) => {
          if (grnTarget) await recordGrnMutation.mutateAsync({ id: grnTarget.id, values })
        }}
      />
    </div>
  )
}
