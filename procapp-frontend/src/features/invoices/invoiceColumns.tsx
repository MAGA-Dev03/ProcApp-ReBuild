import type { ColumnDef } from '@tanstack/react-table'
import type { InvoiceWithRelations } from '@/types'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import { StatusBadge } from '@/components/StatusBadge'
import { computeInvoiceStatus } from '@/lib/invoiceStatus'
import { AttachmentCell } from './AttachmentCell'
import { INVOICE_TYPE_OPTIONS } from './invoiceFormSchema'

const INVOICE_TYPE_LABEL = Object.fromEntries(
  INVOICE_TYPE_OPTIONS.map((option) => [option.value, option.label]),
)

export const invoiceColumns: ColumnDef<InvoiceWithRelations, unknown>[] = [
  {
    accessorKey: 'invoiceType',
    header: 'Type',
    enableSorting: false,
    cell: ({ row }) => INVOICE_TYPE_LABEL[row.original.invoiceType] ?? row.original.invoiceType,
  },
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
  {
    accessorKey: 'invoiceNumber',
    header: 'Invoice No',
    enableSorting: false,
  },
  {
    accessorKey: 'receivedDate',
    header: 'Received Date',
  },
  {
    accessorKey: 'purchaseOrderNumber',
    header: 'PO Number',
    enableSorting: false,
  },
  {
    accessorKey: 'value',
    header: 'Value',
    enableSorting: false,
    cell: ({ row }) => <CurrencyDisplay value={row.original.value} />,
  },
  {
    id: 'attachment',
    header: 'Attachment',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.attachmentUrl ? (
        <AttachmentCell invoiceId={row.original.id} />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: 'status',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }) => <StatusBadge status={computeInvoiceStatus(row.original)} />,
  },
]
