import type { ColumnDef } from '@tanstack/react-table'
import type { User } from '@/types'
import { Badge } from '@/components/ui/badge'

export const userColumns: ColumnDef<User, unknown>[] = [
  { accessorKey: 'name', header: 'Name', enableSorting: false },
  { accessorKey: 'email', header: 'Email', enableSorting: false },
  {
    id: 'roles',
    header: 'Roles',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.roles.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          row.original.roles.map((role) => (
            <Badge key={role.id} variant="secondary">
              {role.name}
            </Badge>
          ))
        )}
      </div>
    ),
  },
  {
    id: 'active',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }) => (
      <Badge variant={row.original.active ? 'default' : 'destructive'}>
        {row.original.active ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
]
