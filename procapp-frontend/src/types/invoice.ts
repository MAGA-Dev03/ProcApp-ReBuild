import type { Project } from './project'
import type { Supplier } from './supplier'
import type { User } from './user'

export type InvoiceType = 'CREDIT' | 'ADVANCE' | 'LC'
export type InvoiceSource = 'DIRECT' | 'STORES' | 'PROJECT'

export interface Invoice {
  id: number
  invoiceType: InvoiceType
  invoiceSource: InvoiceSource
  projectId: number
  supplierId: number
  invoiceNumber: string
  invoiceDate: string
  receivedDate: string
  purchaseOrderNumber: string
  value: number
  pioNumber: string
  grnNumber: string | null
  grnReceivedDate: string | null
  /** Finance ledger number, format YYYY/MM/DD/NNN, assigned once submitted to finance. */
  listNo: string | null
  financeSubmitDate: string | null
  remarks: string | null
  attachmentUrl: string | null
  attachmentViewed: boolean
  active: boolean
  authorUserId: number
  updatedByUserId: number | null
  createdAt: string
  updatedAt: string
}

/** Shape returned by list/detail endpoints once FKs are resolved server-side. */
export interface InvoiceWithRelations extends Invoice {
  project: Pick<Project, 'id' | 'code' | 'name' | 'status'>
  supplier: Pick<Supplier, 'id' | 'name' | 'businessPartnerCode'>
  author: Pick<User, 'id' | 'name'>
  updatedBy: Pick<User, 'id' | 'name'> | null
}
