import type { ColumnDef } from '@tanstack/react-table'
import type { AuditLogEntry } from '@/types'
import { ActionBadge } from '@/components/ActionBadge'

export const auditLogColumns: ColumnDef<AuditLogEntry, unknown>[] = [
  {
    id: 'invoice',
    header: 'Invoice',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.invoiceNumber ?? (
        <span className="text-muted-foreground">
          #{row.original.invoiceId} <span className="italic">(deleted)</span>
        </span>
      ),
  },
  {
    id: 'action',
    header: 'Action',
    enableSorting: false,
    cell: ({ row }) => <ActionBadge action={row.original.action} />,
  },
  {
    id: 'performedBy',
    header: 'Performed By',
    enableSorting: false,
    cell: ({ row }) => row.original.performedByName ?? '—',
  },
  {
    id: 'performedAt',
    header: 'Performed At',
    enableSorting: false,
    cell: ({ row }) => new Date(row.original.performedAt).toLocaleString(),
  },
]
