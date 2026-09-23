import type { AuditLogAction, AuditLogEntry, Page, PageParams } from '@/types'
import { http } from './http'

export interface ListAuditLogParams extends PageParams {
  invoiceId?: number
  action?: AuditLogAction
  performedByUserId?: number
  search?: string
  dateFrom?: string
  dateTo?: string
}

export async function listInvoiceAuditLog(
  params: ListAuditLogParams = {},
): Promise<Page<AuditLogEntry>> {
  return http<Page<AuditLogEntry>>('/api/audit-log/invoices', {
    params: {
      invoiceId: params.invoiceId,
      action: params.action,
      performedByUserId: params.performedByUserId,
      search: params.search,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      page: params.page,
      size: params.size,
    },
  })
}
