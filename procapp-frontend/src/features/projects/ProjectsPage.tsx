import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createProject,
  deleteProject,
  getProjectDeleteImpact,
  listProjects,
  updateProject,
} from '@/api/client'
import type { Project } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { projectColumns } from './projectColumns'
import { ProjectFormModal, type ProjectFormValues } from './ProjectFormModal'

const PAGE_SIZE = 10

export function ProjectsPage() {
  const queryClient = useQueryClient()

  const [formTarget, setFormTarget] = useState<Project | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [pageIndex, setPageIndex] = useState(0)

  const projectsQuery = useQuery({
    queryKey: ['projects', 'list', { debouncedSearch, pageIndex }],
    queryFn: () =>
      listProjects({ search: debouncedSearch || undefined, page: pageIndex, size: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  })

  const deleteImpactQuery = useQuery({
    queryKey: ['projects', 'delete-impact', deleteTarget?.id],
    queryFn: () => getProjectDeleteImpact(deleteTarget!.id),
    enabled: deleteTarget !== null,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }

  const createMutation = useMutation({
    mutationFn: (values: ProjectFormValues) => createProject(values),
    onSuccess: () => {
      invalidate()
      setFormTarget(undefined)
      toast.success('Project created')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: ProjectFormValues }) =>
      updateProject(id, values),
    onSuccess: () => {
      invalidate()
      setFormTarget(undefined)
      toast.success('Project updated')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => {
      invalidate()
      toast.success('Project deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not delete the project.')
    },
  })

  async function handleSubmit(values: ProjectFormValues) {
    if (formTarget) {
      await updateMutation.mutateAsync({ id: formTarget.id, values })
    } else {
      await createMutation.mutateAsync(values)
    }
  }

  const invoiceCount = deleteImpactQuery.data?.invoiceCount ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage projects and their contract details."
        actions={
          <Button type="button" onClick={() => setFormTarget(null)}>
            <Plus className="size-4" /> Add Project
          </Button>
        }
      />

      <DataTable
        columns={projectColumns}
        data={projectsQuery.data?.content ?? []}
        rowCount={projectsQuery.data?.totalElements ?? 0}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        onPageChange={setPageIndex}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPageIndex(0)
        }}
        searchPlaceholder="Search code or name…"
        getRowId={(row) => String(row.id)}
        isLoading={projectsQuery.isLoading}
        isError={projectsQuery.isError}
        emptyMessage={
          search
            ? 'No projects match your search.'
            : 'No projects yet. Click "Add Project" above to create the first one.'
        }
        rowActions={(project) => (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${project.name}`}
              onClick={() => setFormTarget(project)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${project.name}`}
              onClick={() => setDeleteTarget(project)}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      />

      <ProjectFormModal
        open={formTarget !== undefined}
        project={formTarget}
        onOpenChange={(open) => !open && setFormTarget(undefined)}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        description={
          deleteImpactQuery.isLoading
            ? 'Checking how many invoices reference this project…'
            : invoiceCount > 0
              ? `This project has ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'} logged against it. Deleting the project will permanently delete ${invoiceCount === 1 ? 'that invoice' : 'all of those invoices'} too. This cannot be undone.`
              : 'This project has no invoices logged against it. This action cannot be undone.'
        }
        confirmLabel={
          invoiceCount > 0
            ? `Delete project and ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'}`
            : 'Delete'
        }
        confirmDisabled={deleteImpactQuery.isLoading}
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.id)
        }}
      />
    </div>
  )
}
