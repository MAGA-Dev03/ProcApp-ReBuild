import type { ColumnDef } from '@tanstack/react-table'
import type { Supplier } from '@/types'

export const supplierColumns: ColumnDef<Supplier, unknown>[] = [
  { accessorKey: 'businessPartnerCode', header: 'BP Code', enableSorting: false },
  { accessorKey: 'name', header: 'Name', enableSorting: false },
  { accessorKey: 'address', header: 'Address', enableSorting: false },
  { accessorKey: 'email', header: 'Email', enableSorting: false },
  { accessorKey: 'contact', header: 'Contact', enableSorting: false },
]
