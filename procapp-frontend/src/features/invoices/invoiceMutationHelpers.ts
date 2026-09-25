import type { UpdateInvoicePayload } from '@/api/client'
import type { InvoiceSource, InvoiceType } from '@/types'
import type { InvoiceFormValues } from './invoiceFormSchema'

export function monthToRange(month: string): { from: string; to: string } | null {
  if (!month) return null
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` }
}

export function toCreatePayload(values: InvoiceFormValues, authorUserId: number) {
  // The attachment file is uploaded in a follow-up multipart call after the
  // invoice exists (see uploadInvoiceAttachment) — never in this JSON body.
  return {
    invoiceType: values.invoiceType as InvoiceType,
    invoiceSource: values.invoiceSource as InvoiceSource,
    projectId: Number(values.projectId),
    supplierId: Number(values.supplierId),
    invoiceNumber: values.invoiceNumber,
    invoiceDate: values.invoiceDate,
    receivedDate: values.receivedDate,
    purchaseOrderNumber: values.purchaseOrderNumber,
    value: values.value!,
    pioNumber: values.pioNumber,
    grnNumber: values.grnNumber || undefined,
    grnReceivedDate: values.grnReceivedDate || undefined,
    remarks: values.remarks || undefined,
    authorUserId,
  }
}

export function toUpdatePayload(
  values: InvoiceFormValues,
  updatedByUserId: number,
  attachmentRemoved: boolean,
): UpdateInvoicePayload {
  const payload: UpdateInvoicePayload = {
    invoiceType: values.invoiceType as InvoiceType,
    invoiceSource: values.invoiceSource as InvoiceSource,
    projectId: Number(values.projectId),
    supplierId: Number(values.supplierId),
    invoiceNumber: values.invoiceNumber,
    invoiceDate: values.invoiceDate,
    receivedDate: values.receivedDate,
    purchaseOrderNumber: values.purchaseOrderNumber,
    value: values.value!,
    pioNumber: values.pioNumber,
    grnNumber: values.grnNumber || null,
    grnReceivedDate: values.grnReceivedDate || null,
    remarks: values.remarks || null,
    updatedByUserId,
  }
  // A newly picked file is uploaded separately (see uploadInvoiceAttachment).
  // Here we only need to clear the reference when the user removed it.
  if (!values.attachment && attachmentRemoved) {
    payload.attachmentUrl = null
  }
  return payload
}
