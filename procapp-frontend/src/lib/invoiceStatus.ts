import type { Invoice } from '@/types'

export const INVOICE_STATUSES = [
  'OPEN',
  'GRN_PENDING',
  'GRN_RECEIVED',
  'SUBMITTED',
  'CANCELLED',
] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

type StatusInput = Pick<Invoice, 'active' | 'listNo' | 'grnNumber' | 'grnReceivedDate'>

/**
 * GRN_PENDING vs GRN_RECEIVED distinguishes a GRN number being allocated from goods actually
 * being received - the two fields are set together in seed data today but are independent
 * in the schema, so a real workflow can populate them at different times.
 */
export function computeInvoiceStatus(invoice: StatusInput): InvoiceStatus {
  if (!invoice.active) return 'CANCELLED'
  if (invoice.listNo) return 'SUBMITTED'
  if (invoice.grnNumber && invoice.grnReceivedDate) return 'GRN_RECEIVED'
  if (invoice.grnNumber) return 'GRN_PENDING'
  return 'OPEN'
}
