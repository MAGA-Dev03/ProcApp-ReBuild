import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  ApiError,
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
} from '@/api/client'
import type { Supplier } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { supplierColumns } from './supplierColumns'
import { SupplierFormModal, type SupplierFormValues } from './SupplierFormModal'

const PAGE_SIZE = 10

export function SuppliersPage() {
  const queryClient = useQueryClient()

  const [formTarget, setFormTarget] = useState<Supplier | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [pageIndex, setPageIndex] = useState(0)

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', 'list', { debouncedSearch, pageIndex }],
    queryFn: () =>
      listSuppliers({ search: debouncedSearch || undefined, page: pageIndex, size: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] })
  }

  const createMutation = useMutation({
    mutationFn: (values: SupplierFormValues) => createSupplier(values),
    onSuccess: () => {
      invalidate()
      setFormTarget(undefined)
      toast.success('Supplier created')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: SupplierFormValues }) =>
      updateSupplier(id, values),
    onSuccess: () => {
      invalidate()
      setFormTarget(undefined)
      toast.success('Supplier updated')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSupplier(id),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success('Supplier deleted')
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not delete the supplier. Please try again.',
      )
    },
  })

  async function handleSubmit(values: SupplierFormValues) {
    if (formTarget) {
      await updateMutation.mutateAsync({ id: formTarget.id, values })
    } else {
      await createMutation.mutateAsync(values)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Manage supplier business partner records."
        actions={
          <Button type="button" onClick={() => setFormTarget(null)}>
            <Plus className="size-4" /> Add Supplier
          </Button>
        }
      />

      <DataTable
        columns={supplierColumns}
        data={suppliersQuery.data?.content ?? []}
        rowCount={suppliersQuery.data?.totalElements ?? 0}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        onPageChange={setPageIndex}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPageIndex(0)
        }}
        searchPlaceholder="Search BP code or name…"
        getRowId={(row) => String(row.id)}
        isLoading={suppliersQuery.isLoading}
        isError={suppliersQuery.isError}
        emptyMessage={
          search
            ? 'No suppliers match your search.'
            : 'No suppliers yet. Click "Add Supplier" above to create the first one.'
        }
        rowActions={(supplier) => (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${supplier.name}`}
              onClick={() => setFormTarget(supplier)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${supplier.name}`}
              onClick={() => setDeleteTarget(supplier)}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      />

      <SupplierFormModal
        open={formTarget !== undefined}
        supplier={formTarget}
        onOpenChange={(open) => !open && setFormTarget(undefined)}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        description="This permanently removes the supplier. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.id)
        }}
      />
    </div>
  )
}
