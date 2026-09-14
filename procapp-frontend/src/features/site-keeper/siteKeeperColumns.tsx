import type { ColumnDef } from '@tanstack/react-table'
import { Download } from 'lucide-react'
import type { InvoiceWithRelations } from '@/types'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import { StatusBadge } from '@/components/StatusBadge'
import { computeInvoiceStatus } from '@/lib/invoiceStatus'
import { cn } from '@/lib/utils'

/** Factory so the Attachment cell can call back into the page when the button is clicked (downloads
 * the file, opens it, and marks it viewed in the same action). */
export function createSiteKeeperColumns(
  onViewAttachment: (invoice: InvoiceWithRelations) => void,
): ColumnDef<InvoiceWithRelations, unknown>[] {
  return [
    { accessorKey: 'invoiceType', header: 'Type', enableSorting: false },
    {
      id: 'project',
      header: 'Project',
      enableSorting: false,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.project.name}</span>,
    },
    {
      id: 'supplier',
      header: 'Supplier',
      enableSorting: false,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.supplier.name}</span>,
    },
    { accessorKey: 'invoiceNumber', header: 'Invoice No', enableSorting: false },
    { accessorKey: 'receivedDate', header: 'Received Date' },
    { accessorKey: 'purchaseOrderNumber', header: 'PO Number', enableSorting: false },
    {
      accessorKey: 'value',
      header: 'Value',
      enableSorting: false,
      cell: ({ row }) => <CurrencyDisplay value={row.original.value} />,
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => <StatusBadge status={computeInvoiceStatus(row.original)} />,
    },
    {
      id: 'attachment',
      header: 'Attachment',
      enableSorting: false,
      cell: ({ row }) => {
        const invoice = row.original

        if (!invoice.attachmentUrl) {
          return <span className="text-muted-foreground">—</span>
        }

        if (invoice.attachmentViewed) {
          return (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
              )}
            >
              Viewed
            </span>
          )
        }

        return (
          <button
            type="button"
            onClick={() => onViewAttachment(invoice)}
            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400"
          >
            <Download className="size-3.5" />
            Attachment
          </button>
        )
      },
    },
  ]
}
