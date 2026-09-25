import type { ColumnDef } from '@tanstack/react-table'
import type { Project } from '@/types'
import { Badge } from '@/components/ui/badge'

export const projectColumns: ColumnDef<Project, unknown>[] = [
  { accessorKey: 'code', header: 'Code', enableSorting: false },
  { accessorKey: 'name', header: 'Name', enableSorting: false },
  {
    id: 'status',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'WORKING' ? 'default' : 'secondary'}>
        {row.original.status === 'WORKING' ? 'Working' : 'Finished'}
      </Badge>
    ),
  },
  { accessorKey: 'contractName', header: 'Contract Name', enableSorting: false },
]
