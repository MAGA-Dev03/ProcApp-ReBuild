import type {
  Invoice,
  InvoiceSource,
  InvoiceType,
  InvoiceWithRelations,
  Page,
  PageParams,
} from '@/types'
import { http, httpDownload, httpUpload, type DownloadedFile } from './http'

export interface ListInvoicesParams extends PageParams {
  projectId?: number
  projectIds?: number[]
  supplierId?: number
  invoiceType?: InvoiceType
  invoiceSource?: InvoiceSource
  active?: boolean
  hasListNo?: boolean
  financeSubmitted?: boolean
  search?: string
  dateFrom?: string
  dateTo?: string
  receivedDateFrom?: string
  receivedDateTo?: string
  dateType?: 'invoiceDate' | 'receivedDate' | 'grnReceivedDate' | 'financeSubmitDate'
  dateExact?: string
  reportStatus?: 'NOT_SUBMITTED' | 'GRN_PENDING' | 'GRN_RECEIVED' | 'SUBMITTED'
  listNo?: string
}

export type CreateInvoicePayload = Pick<
  Invoice,
  | 'invoiceType'
  | 'invoiceSource'
  | 'projectId'
  | 'supplierId'
  | 'invoiceNumber'
  | 'invoiceDate'
  | 'receivedDate'
  | 'purchaseOrderNumber'
  | 'value'
  | 'pioNumber'
> &
  Partial<Pick<Invoice, 'remarks' | 'attachmentUrl' | 'grnNumber' | 'grnReceivedDate'>> & {
    authorUserId: number
  }

export type UpdateInvoicePayload = Partial<Omit<Invoice, 'id' | 'createdAt' | 'authorUserId'>> & {
  updatedByUserId: number
}

export interface RecordGrnPayload {
  grnNumber: string
  grnReceivedDate: string
  pioNumber?: string
  updatedByUserId: number
}

export interface BatchAddToFinancePayload {
  financeSubmitDate: string
  updatedByUserId: number
}

export interface DuplicateInvoiceCheckResult {
  isDuplicate: boolean
  existingInvoiceId?: number
}

// Backend returns nested { project, supplier, author, updatedBy } objects.
// Our frontend's InvoiceWithRelations needs BOTH the nested picks AND the
// flat *Id fields (it extends Invoice). This adapter bridges that gap in
// one place so every call site below can stay untouched.
function adaptInvoice(raw: any): InvoiceWithRelations {
  return {
    ...raw,
    projectId: raw.project.id,
    supplierId: raw.supplier.id,
    authorUserId: raw.author.id,
    updatedByUserId: raw.updatedBy?.id ?? null,
  }
}

export async function listInvoices(
  params: ListInvoicesParams = {},
): Promise<Page<InvoiceWithRelations>> {
  const page = await http<Page<any>>('/api/invoices', { params: params as Record<string, any> })
  return { ...page, content: page.content.map(adaptInvoice) }
}

export async function listInvoicesForSiteKeeper(
  _currentUserId: number, // scope is derived server-side from the token; kept for call-site compatibility
  params: ListInvoicesParams = {},
): Promise<Page<InvoiceWithRelations>> {
  const page = await http<Page<any>>('/api/site-keeper/invoices', {
    params: params as Record<string, any>,
  })
  return { ...page, content: page.content.map(adaptInvoice) }
}

/** Uploads a single file as the invoice's attachment (multipart). The backend
 * stores it on disk and sets attachmentUrl to the stored key. */
export async function uploadInvoiceAttachment(
  id: number,
  file: File,
): Promise<InvoiceWithRelations> {
  const raw = await httpUpload<any>(`/api/invoices/${id}/attachment`, file)
  return adaptInvoice(raw)
}

/** Fetches the attachment bytes for an invoice — the endpoint needs the bearer
 * token so a direct link won't work. */
export async function downloadInvoiceAttachment(id: number): Promise<DownloadedFile> {
  return httpDownload(`/api/invoices/${id}/attachment`)
}

/** Site-keeper only: mark an invoice's attachment as viewed. Uses the
 * site-keeper-scoped endpoint (the /api/invoices tree is procurement-only). */
export async function markAttachmentViewed(id: number, _updatedByUserId: number): Promise<Invoice> {
  const raw = await http<any>(`/api/site-keeper/invoices/${id}/attachment-viewed`, { method: 'POST' })
  return adaptInvoice(raw)
}

/** Site-keeper variant of downloadInvoiceAttachment, scoped to the keeper's projects. */
export async function downloadSiteKeeperAttachment(id: number): Promise<DownloadedFile> {
  return httpDownload(`/api/site-keeper/invoices/${id}/attachment`)
}

export async function getInvoice(id: number): Promise<InvoiceWithRelations> {
  const raw = await http<any>(`/api/invoices/${id}`)
  return adaptInvoice(raw)
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  const raw = await http<any>('/api/invoices', { method: 'POST', body: payload })
  return adaptInvoice(raw)
}

export async function updateInvoice(id: number, payload: UpdateInvoicePayload): Promise<Invoice> {
  const current = await getInvoice(id)
  const merged = { ...current, ...payload }
  const { id: _id, createdAt: _createdAt, authorUserId: _authorUserId, ...body } = merged as any
  const raw = await http<any>(`/api/invoices/${id}`, { method: 'PUT', body })
  return adaptInvoice(raw)
}

export async function deleteInvoice(id: number): Promise<void> {
  await http<void>(`/api/invoices/${id}`, { method: 'DELETE' })
}

export async function cancelInvoice(id: number, _updatedByUserId: number): Promise<Invoice> {
  const raw = await http<any>(`/api/invoices/${id}/cancel`, { method: 'POST' })
  return adaptInvoice(raw)
}

export async function activateInvoice(id: number, _updatedByUserId: number): Promise<Invoice> {
  const raw = await http<any>(`/api/invoices/${id}/activate`, { method: 'POST' })
  return adaptInvoice(raw)
}

export async function clearFinanceSubmission(id: number, _updatedByUserId: number): Promise<Invoice> {
  const raw = await http<any>(`/api/invoices/${id}/clear-finance-submission`, { method: 'POST' })
  return adaptInvoice(raw)
}

export async function recordGrn(id: number, payload: RecordGrnPayload): Promise<Invoice> {
  await http<any>(`/api/invoices/${id}/grn`, {
    method: 'POST',
    body: { grnNumber: payload.grnNumber },
  })
  // grnReceivedDate/pioNumber aren't part of the dedicated /grn endpoint's
  // contract, so fold them into a follow-up updateInvoice call.
  return updateInvoice(id, {
    grnReceivedDate: payload.grnReceivedDate,
    pioNumber: payload.pioNumber,
    updatedByUserId: payload.updatedByUserId,
  })
}

export async function checkDuplicateInvoiceNumber(params: {
  supplierId: number
  invoiceNumber: string
  excludeInvoiceId?: number
}): Promise<DuplicateInvoiceCheckResult> {
  return http<DuplicateInvoiceCheckResult>('/api/invoices/check-duplicate', {
    params: params as Record<string, any>,
  })
}

export async function batchAddToFinance(
  invoiceIds: number[],
  _payload: BatchAddToFinancePayload,
): Promise<Invoice[]> {
  await http<{ listNo: string; invoiceCount: number }>('/api/invoices/batch-add-to-finance', {
    method: 'POST',
    body: { invoiceIds },
  })
  // Backend returns a summary, not the full invoice list — re-fetch the
  // affected invoices so this function's return type still matches what
  // callers expect.
  const invoices = await Promise.all(invoiceIds.map((id) => getInvoice(id)))
  return invoices
}

export async function getDistinctListNumbers(): Promise<string[]> {
  // Dedicated endpoint returns every distinct list number, newest first.
  // The old approach paged the first 1000 invoices and silently dropped
  // any batch numbers beyond that window.
  return http<string[]>('/api/invoices/list-numbers')
}