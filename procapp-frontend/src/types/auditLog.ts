/** Must stay in sync with the action strings InvoiceService writes on the backend. */
export const AUDIT_LOG_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'CANCEL',
  'ACTIVATE',
  'SET_GRN',
  'CLEAR_FINANCE_SUBMISSION',
  'ADD_TO_FINANCE',
  'UPLOAD_ATTACHMENT',
] as const

export type AuditLogAction = (typeof AUDIT_LOG_ACTIONS)[number]

/** One append-only row from invoice_audit_log. `invoiceNumber` is null when the invoice has
 * since been hard-deleted - the row has no foreign key to the invoice, by design, so it survives
 * that deletion. `beforeData`/`afterData` are JSON strings, parsed on demand for display. */
export interface AuditLogEntry {
  id: number
  invoiceId: number
  invoiceNumber: string | null
  action: AuditLogAction
  performedByUserId: number | null
  performedByName: string | null
  performedAt: string
  beforeData: string | null
  afterData: string | null
}
