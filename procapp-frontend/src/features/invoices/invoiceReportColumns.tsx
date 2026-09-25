import type { ColumnDef } from '@tanstack/react-table'
import type { InvoiceWithRelations } from '@/types'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import { AttachmentCell } from './AttachmentCell'
import { INVOICE_SOURCE_OPTIONS, INVOICE_TYPE_OPTIONS } from './invoiceFormSchema'

const INVOICE_TYPE_LABEL = Object.fromEntries(
  INVOICE_TYPE_OPTIONS.map((option) => [option.value, option.label]),
)
const INVOICE_SOURCE_LABEL = Object.fromEntries(
  INVOICE_SOURCE_OPTIONS.map((option) => [option.value, option.label]),
)

function dashIfEmpty(value: string | null | undefined) {
  return value ? value : <span className="text-muted-foreground">—</span>
}

/** Every invoice field, for the wide horizontally-scrollable report table. No row actions - this
 * screen is read-only reporting. */
export const invoiceReportColumns: ColumnDef<InvoiceWithRelations, unknown>[] = [
  {
    accessorKey: 'invoiceType',
    header: 'Type',
    enableSorting: false,
    cell: ({ row }) => INVOICE_TYPE_LABEL[row.original.invoiceType] ?? row.original.invoiceType,
  },
  {
    accessorKey: 'invoiceSource',
    header: 'Source',
    enableSorting: false,
    cell: ({ row }) =>
      INVOICE_SOURCE_LABEL[row.original.invoiceSource] ?? row.original.invoiceSource,
  },
  {
    id: 'project',
    header: 'Project',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        {row.original.project.name}{' '}
        <span className="text-muted-foreground">({row.original.project.code})</span>
      </span>
    ),
  },
  {
    id: 'supplier',
    header: 'Supplier',
    enableSorting: false,
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.supplier.name}</span>,
  },
  { accessorKey: 'invoiceNumber', header: 'Invoice No', enableSorting: false },
  { accessorKey: 'invoiceDate', header: 'Invoice Date' },
  { accessorKey: 'receivedDate', header: 'Received Date' },
  { accessorKey: 'purchaseOrderNumber', header: 'PO Number', enableSorting: false },
  {
    accessorKey: 'value',
    header: 'Value',
    enableSorting: false,
    cell: ({ row }) => <CurrencyDisplay value={row.original.value} />,
  },
  { accessorKey: 'pioNumber', header: 'PIO No', enableSorting: false },
  {
    accessorKey: 'grnNumber',
    header: 'GRN No',
    enableSorting: false,
    cell: ({ row }) => dashIfEmpty(row.original.grnNumber),
  },
  {
    accessorKey: 'grnReceivedDate',
    header: 'GRN Received Date',
    enableSorting: false,
    cell: ({ row }) => dashIfEmpty(row.original.grnReceivedDate),
  },
  {
    accessorKey: 'listNo',
    header: 'List No',
    enableSorting: false,
    cell: ({ row }) => dashIfEmpty(row.original.listNo),
  },
  {
    accessorKey: 'financeSubmitDate',
    header: 'Finance Submit Date',
    enableSorting: false,
    cell: ({ row }) => dashIfEmpty(row.original.financeSubmitDate),
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="block max-w-[220px] truncate" title={row.original.remarks ?? ''}>
        {dashIfEmpty(row.original.remarks)}
      </span>
    ),
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
    id: 'active',
    header: 'Status',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.active ? (
        <Badge variant="secondary">Active</Badge>
      ) : (
        <Badge variant="destructive">Cancelled</Badge>
      ),
  },
  {
    id: 'author',
    header: 'Author',
    enableSorting: false,
    cell: ({ row }) => <span className="whitespace-nowrap">{row.original.author.name}</span>,
  },
  {
    id: 'updatedBy',
    header: 'Updated By',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{row.original.updatedBy?.name ?? '—'}</span>
    ),
  },
  { accessorKey: 'createdAt', header: 'Created At', enableSorting: false },
  { accessorKey: 'updatedAt', header: 'Updated At', enableSorting: false },
]
