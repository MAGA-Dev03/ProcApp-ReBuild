import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  ApiError,
  createRole,
  createUser,
  deleteUser,
  listAllProjects,
  listRoles,
  listUsers,
  updateUser,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '@/api/client'
import type { Role, User } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { userColumns } from './userColumns'
import { UserFormModal, type UserFormValues } from './UserFormModal'
import { AddRoleModal } from './AddRoleModal'

const PAGE_SIZE = 10

function toCreatePayload(values: UserFormValues): CreateUserPayload {
  return {
    name: values.name,
    email: values.email,
    password: values.password,
    roleIds: values.roleIds.map(Number),
    allProjects: values.allProjects,
    projectIds: values.allProjects ? [] : values.projectIds.map(Number),
    active: values.active,
  }
}

/** Blank password means "keep the existing one" - the field is simply omitted from the payload. */
function toUpdatePayload(values: UserFormValues): UpdateUserPayload {
  return {
    name: values.name,
    email: values.email,
    ...(values.password ? { password: values.password } : {}),
    roleIds: values.roleIds.map(Number),
    allProjects: values.allProjects,
    projectIds: values.allProjects ? [] : values.projectIds.map(Number),
    active: values.active,
  }
}

export function UsersPage() {
  const queryClient = useQueryClient()

  const [formTarget, setFormTarget] = useState<User | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [showAddRole, setShowAddRole] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [pageIndex, setPageIndex] = useState(0)

  const usersQuery = useQuery({
    queryKey: ['users', 'list', { debouncedSearch, pageIndex }],
    queryFn: () =>
      listUsers({ search: debouncedSearch || undefined, page: pageIndex, size: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  })

  const rolesQuery = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: () => listRoles(),
  })
  const projectsQuery = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: listAllProjects,
  })

  const roleOptions = useMemo(
    () =>
      (rolesQuery.data ?? [])
        .filter((role: Role) => role.name !== 'SYSTEM_ADMIN')
        .map((role: Role) => ({ value: String(role.id), label: role.name })),
    [rolesQuery.data],
  )
  const projectOptions = useMemo(
    () => (projectsQuery.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
    [projectsQuery.data],
  )

  function invalidateUsers() {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  const createMutation = useMutation({
    mutationFn: (values: UserFormValues) => createUser(toCreatePayload(values)),
    onSuccess: () => {
      invalidateUsers()
      setFormTarget(undefined)
      toast.success('User created')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: number; values: UserFormValues }) =>
      updateUser(id, toUpdatePayload(values)),
    onSuccess: () => {
      invalidateUsers()
      setFormTarget(undefined)
      toast.success('User updated')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      invalidateUsers()
      setDeleteTarget(null)
      toast.success('User deleted')
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : 'Could not delete the user. Please try again.',
      )
    },
  })

  async function handleSubmit(values: UserFormValues) {
    if (formTarget) {
      await updateMutation.mutateAsync({ id: formTarget.id, values })
    } else {
      await createMutation.mutateAsync(values)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage user accounts, roles, and project access."
        actions={
          <Button type="button" onClick={() => setFormTarget(null)}>
            <Plus className="size-4" /> Add User
          </Button>
        }
      />

      <DataTable
        columns={userColumns}
        data={usersQuery.data?.content ?? []}
        rowCount={usersQuery.data?.totalElements ?? 0}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        onPageChange={setPageIndex}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value)
          setPageIndex(0)
        }}
        searchPlaceholder="Search name or email…"
        getRowId={(row) => String(row.id)}
        isLoading={usersQuery.isLoading}
        isError={usersQuery.isError}
        emptyMessage={
          search
            ? 'No users match your search.'
            : 'No users yet. Click "Add User" above to create the first one.'
        }
        rowActions={(user) => (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${user.name}`}
              onClick={() => setFormTarget(user)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete ${user.name}`}
              onClick={() => setDeleteTarget(user)}
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      />

      <UserFormModal
        open={formTarget !== undefined}
        user={formTarget}
        roleOptions={roleOptions}
        projectOptions={projectOptions}
        onOpenChange={(open) => !open && setFormTarget(undefined)}
        onSubmit={handleSubmit}
        onRequestAddRole={() => setShowAddRole(true)}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <AddRoleModal
        open={showAddRole}
        onOpenChange={setShowAddRole}
        onSubmit={(values) => createRole(values)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['roles'] })
          toast.success('Role created')
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name}?`}
        description="This permanently removes the user account. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteTarget) await deleteMutation.mutateAsync(deleteTarget.id)
        }}
      />
    </div>
  )
}
