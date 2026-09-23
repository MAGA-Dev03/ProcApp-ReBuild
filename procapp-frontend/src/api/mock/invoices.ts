import type {
  Invoice,
  InvoiceSource,
  InvoiceType,
  InvoiceWithRelations,
  Page,
  PageParams,
} from '@/types'
import { ApiError } from '../apiError'
import { db, nextInvoiceId } from './db'
import { delay, maybeFail, paginate, toIsoDate } from './utils'

export interface ListInvoicesParams extends PageParams {
  projectId?: number
  /** "IN" restriction to a set of project ids - how server-side scoping (e.g. Site Store Keeper's
   * assigned projects) is applied, distinct from the single-project `projectId` filter above. */
  projectIds?: number[]
  supplierId?: number
  invoiceType?: InvoiceType
  invoiceSource?: InvoiceSource
  active?: boolean
  hasListNo?: boolean
  /** True = already submitted to finance (financeSubmitDate set); false = still pending. */
  financeSubmitted?: boolean
  search?: string
  dateFrom?: string
  dateTo?: string
  /** Filters on receivedDate instead of invoiceDate - e.g. a month picker. */
  receivedDateFrom?: string
  receivedDateTo?: string
  /** Exact-day match against the field named by dateType - the report screen's Date Type picker. */
  dateType?: 'invoiceDate' | 'receivedDate' | 'grnReceivedDate' | 'financeSubmitDate'
  dateExact?: string
  /** Finance-processing status, independent of active/cancelled. */
  reportStatus?: 'NOT_SUBMITTED' | 'GRN_PENDING' | 'GRN_RECEIVED' | 'SUBMITTED'
  /** Exact match on listNo - the report screen's searchable List No filter. */
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

function toInvoiceWithRelations(invoice: Invoice): InvoiceWithRelations {
  const project = db.projects.find((p) => p.id === invoice.projectId)
  const supplier = db.suppliers.find((s) => s.id === invoice.supplierId)
  const author = db.users.find((u) => u.id === invoice.authorUserId)
  const updatedBy = invoice.updatedByUserId
    ? db.users.find((u) => u.id === invoice.updatedByUserId)
    : null

  if (!project || !supplier || !author) {
    throw new ApiError(`Invoice ${invoice.id} references missing project/supplier/author`, 500)
  }

  return {
    ...invoice,
    project: { id: project.id, code: project.code, name: project.name, status: project.status },
    supplier: {
      id: supplier.id,
      name: supplier.name,
      businessPartnerCode: supplier.businessPartnerCode,
    },
    author: { id: author.id, name: author.name },
    updatedBy: updatedBy ? { id: updatedBy.id, name: updatedBy.name } : null,
  }
}

function findInvoiceOrThrow(id: number): Invoice {
  const invoice = db.invoices.find((inv) => inv.id === id)
  if (!invoice) {
    throw new ApiError(`Invoice ${id} not found`, 404)
  }
  return invoice
}

export async function listInvoices(
  params: ListInvoicesParams = {},
): Promise<Page<InvoiceWithRelations>> {
  await delay()

  let results = db.invoices

  if (params.projectId !== undefined) {
    results = results.filter((inv) => inv.projectId === params.projectId)
  }
  if (params.projectIds !== undefined) {
    const allowedIds = new Set(params.projectIds)
    results = results.filter((inv) => allowedIds.has(inv.projectId))
  }
  if (params.supplierId !== undefined) {
    results = results.filter((inv) => inv.supplierId === params.supplierId)
  }
  if (params.invoiceType) {
    results = results.filter((inv) => inv.invoiceType === params.invoiceType)
  }
  if (params.invoiceSource) {
    results = results.filter((inv) => inv.invoiceSource === params.invoiceSource)
  }
  if (params.active !== undefined) {
    results = results.filter((inv) => inv.active === params.active)
  }
  if (params.hasListNo !== undefined) {
    results = results.filter((inv) => Boolean(inv.listNo) === params.hasListNo)
  }
  if (params.financeSubmitted !== undefined) {
    results = results.filter((inv) => Boolean(inv.financeSubmitDate) === params.financeSubmitted)
  }
  if (params.dateFrom) {
    results = results.filter((inv) => inv.invoiceDate >= params.dateFrom!)
  }
  if (params.dateTo) {
    results = results.filter((inv) => inv.invoiceDate <= params.dateTo!)
  }
  if (params.receivedDateFrom) {
    results = results.filter((inv) => inv.receivedDate >= params.receivedDateFrom!)
  }
  if (params.receivedDateTo) {
    results = results.filter((inv) => inv.receivedDate <= params.receivedDateTo!)
  }
  if (params.dateType && params.dateExact) {
    results = results.filter((inv) => inv[params.dateType!] === params.dateExact)
  }
  if (params.reportStatus) {
    results = results.filter((inv) => {
      switch (params.reportStatus) {
        case 'NOT_SUBMITTED':
          return !inv.grnNumber
        case 'GRN_PENDING':
          return Boolean(inv.grnNumber) && !inv.grnReceivedDate
        case 'GRN_RECEIVED':
          return Boolean(inv.grnNumber) && Boolean(inv.grnReceivedDate) && !inv.listNo
        case 'SUBMITTED':
          return Boolean(inv.listNo)
        default:
          return true
      }
    })
  }
  if (params.listNo) {
    results = results.filter((inv) => inv.listNo === params.listNo)
  }
  if (params.search) {
    const search = params.search.toLowerCase()
    results = results.filter((inv) => {
      const project = db.projects.find((p) => p.id === inv.projectId)
      const supplier = db.suppliers.find((s) => s.id === inv.supplierId)
      return (
        inv.invoiceNumber.toLowerCase().includes(search) ||
        inv.purchaseOrderNumber.toLowerCase().includes(search) ||
        (inv.listNo ?? '').toLowerCase().includes(search) ||
        (project?.name.toLowerCase().includes(search) ?? false) ||
        (project?.code.toLowerCase().includes(search) ?? false) ||
        (supplier?.name.toLowerCase().includes(search) ?? false)
      )
    })
  }

  const sorted = [...results].sort((a, b) => (a.invoiceDate < b.invoiceDate ? 1 : -1))
  const page = paginate(sorted, params)

  return { ...page, content: page.content.map(toInvoiceWithRelations) }
}

/**
 * Server-side project scoping for the Site Store Keeper screen. `currentUserId` must come from
 * the caller's authenticated session (in this mock, the AuthContext's currentUser.id) - never from
 * a client-supplied filter - because this is the actual authorization boundary: a real backend
 * would derive it from the verified JWT/session and apply the same WHERE-clause restriction at the
 * repository layer, so a tampered request can't widen its own scope. If the caller also passes a
 * specific projectId outside what this user is allowed to see, we don't fall back to "show
 * everything" - we return an empty page, exactly like a row-level security policy would.
 */
export async function listInvoicesForSiteKeeper(
  currentUserId: number,
  params: ListInvoicesParams = {},
): Promise<Page<InvoiceWithRelations>> {
  const user = db.users.find((u) => u.id === currentUserId)
  if (!user) {
    throw new ApiError('User not found', 404)
  }

  if (user.allProjects) {
    return listInvoices(params)
  }

  const allowedProjectIds = (user.projects ?? []).map((project) => project.id)
  if (params.projectId !== undefined && !allowedProjectIds.includes(params.projectId)) {
    await delay()
    return paginate([], params)
  }

  return listInvoices({ ...params, projectIds: allowedProjectIds })
}

/** Marks an invoice's attachment as viewed - the Site Store Keeper screen calls this the moment
 * the attachment link is opened. */
export async function markAttachmentViewed(id: number, updatedByUserId: number): Promise<Invoice> {
  await delay(100, 250)

  const invoice = findInvoiceOrThrow(id)
  invoice.attachmentViewed = true
  invoice.updatedByUserId = updatedByUserId
  invoice.updatedAt = toIsoDate(new Date())
  return invoice
}

export async function getInvoice(id: number): Promise<InvoiceWithRelations> {
  await delay()
  return toInvoiceWithRelations(findInvoiceOrThrow(id))
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  await delay()

  maybeFail(0.1, 'Validation failed', {
    invoiceNumber: 'An invoice with this number may already exist for the supplier.',
  })

  if (!db.projects.some((p) => p.id === payload.projectId)) {
    throw new ApiError('Validation failed', 422, { projectId: 'Project does not exist.' })
  }
  if (!db.suppliers.some((s) => s.id === payload.supplierId)) {
    throw new ApiError('Validation failed', 422, { supplierId: 'Supplier does not exist.' })
  }
  if (payload.value <= 0) {
    throw new ApiError('Validation failed', 422, { value: 'Value must be greater than zero.' })
  }

  const now = toIsoDate(new Date())
  const invoice: Invoice = {
    id: nextInvoiceId(),
    invoiceType: payload.invoiceType,
    invoiceSource: payload.invoiceSource,
    projectId: payload.projectId,
    supplierId: payload.supplierId,
    invoiceNumber: payload.invoiceNumber,
    invoiceDate: payload.invoiceDate,
    receivedDate: payload.receivedDate,
    purchaseOrderNumber: payload.purchaseOrderNumber,
    value: payload.value,
    pioNumber: payload.pioNumber,
    grnNumber: payload.grnNumber ?? null,
    grnReceivedDate: payload.grnReceivedDate ?? null,
    listNo: null,
    financeSubmitDate: null,
    remarks: payload.remarks ?? null,
    attachmentUrl: payload.attachmentUrl ?? null,
    attachmentViewed: false,
    active: true,
    authorUserId: payload.authorUserId,
    updatedByUserId: null,
    createdAt: now,
    updatedAt: now,
  }

  db.invoices.push(invoice)
  return invoice
}

export async function updateInvoice(id: number, payload: UpdateInvoicePayload): Promise<Invoice> {
  await delay()
  maybeFail(0.08, 'Validation failed', { value: 'Value must be greater than zero.' })

  const invoice = findInvoiceOrThrow(id)
  const updated: Invoice = {
    ...invoice,
    ...payload,
    id: invoice.id,
    createdAt: invoice.createdAt,
    authorUserId: invoice.authorUserId,
    updatedAt: toIsoDate(new Date()),
  }

  const index = db.invoices.findIndex((inv) => inv.id === id)
  db.invoices[index] = updated
  return updated
}

/** Hard delete: for data-entry mistakes only. Use cancelInvoice to retire a real invoice with history. */
export async function deleteInvoice(id: number): Promise<void> {
  await delay()

  findInvoiceOrThrow(id)
  const index = db.invoices.findIndex((inv) => inv.id === id)
  db.invoices.splice(index, 1)
}

/** Audit-preserving toggle, restricted to the Procurement Manager role in the UI layer. */
export async function cancelInvoice(id: number, updatedByUserId: number): Promise<Invoice> {
  await delay()

  const invoice = findInvoiceOrThrow(id)
  invoice.active = false
  invoice.updatedByUserId = updatedByUserId
  invoice.updatedAt = toIsoDate(new Date())
  return invoice
}

export async function activateInvoice(id: number, updatedByUserId: number): Promise<Invoice> {
  await delay()

  const invoice = findInvoiceOrThrow(id)
  invoice.active = true
  invoice.updatedByUserId = updatedByUserId
  invoice.updatedAt = toIsoDate(new Date())
  return invoice
}

/**
 * "Un-batch" escape hatch: clears listNo/financeSubmitDate so the invoice drops back to the
 * pending-finance list. Only updatedAt/updatedByUserId record that this happened - there is no
 * separate audit log entry, which the UI must make visible to the user before they confirm.
 */
export async function clearFinanceSubmission(
  id: number,
  updatedByUserId: number,
): Promise<Invoice> {
  await delay()

  const invoice = findInvoiceOrThrow(id)
  invoice.listNo = null
  invoice.financeSubmitDate = null
  invoice.updatedByUserId = updatedByUserId
  invoice.updatedAt = toIsoDate(new Date())
  return invoice
}

export async function recordGrn(id: number, payload: RecordGrnPayload): Promise<Invoice> {
  await delay()
  maybeFail(0.08, 'Validation failed', { grnNumber: 'GRN number is required.' })

  const invoice = findInvoiceOrThrow(id)
  invoice.grnNumber = payload.grnNumber
  invoice.grnReceivedDate = payload.grnReceivedDate
  if (payload.pioNumber) {
    invoice.pioNumber = payload.pioNumber
  }
  invoice.updatedByUserId = payload.updatedByUserId
  invoice.updatedAt = toIsoDate(new Date())
  return invoice
}

export interface DuplicateInvoiceCheckResult {
  isDuplicate: boolean
  existingInvoiceId?: number
}

/** Soft check only - never blocks submission, just informs the user. */
export async function checkDuplicateInvoiceNumber(params: {
  supplierId: number
  invoiceNumber: string
  excludeInvoiceId?: number
}): Promise<DuplicateInvoiceCheckResult> {
  await delay(150, 350)

  const normalized = params.invoiceNumber.trim().toLowerCase()
  if (!normalized) return { isDuplicate: false }

  const match = db.invoices.find(
    (inv) =>
      inv.supplierId === params.supplierId &&
      inv.invoiceNumber.trim().toLowerCase() === normalized &&
      inv.id !== params.excludeInvoiceId,
  )

  return match ? { isDuplicate: true, existingInvoiceId: match.id } : { isDuplicate: false }
}

/**
 * Atomic by construction: every invoice is looked up and validated *before* anything is mutated,
 * so a failure partway through can never leave the batch half-applied. The old system's version of
 * this endpoint ran a bare loop that updated each invoice as it went - a failure on, say, the 7th
 * of 10 invoices left the first 6 submitted and the rest untouched, a well-known source of finance
 * reconciliation headaches. The real Spring Boot endpoint must wrap the whole batch in a single
 * @Transactional method so the database gives the same all-or-nothing guarantee.
 *
 * One listNo is generated for the *whole batch* (this is what "Add to Finance" is: one payment
 * submission covering several invoices, mirroring the old system's List No concept exactly - the
 * Invoice Report's "Generate Finance Report" screen groups invoices by this shared number). NNN
 * resets per calendar month: it counts distinct list numbers already used in the same YYYY/MM,
 * not per day and not per invoice.
 */
export async function batchAddToFinance(
  invoiceIds: number[],
  payload: BatchAddToFinancePayload,
): Promise<Invoice[]> {
  await delay(400, 900)
  maybeFail(0.05, 'One or more invoices could not be submitted to finance', {
    invoiceIds: 'At least one selected invoice is missing a GRN.',
  })

  // Validate every invoice up front. Nothing below this point mutates state, so a thrown error
  // here leaves the database exactly as it was.
  const invoices = invoiceIds.map((id) => findInvoiceOrThrow(id))
  const missingGrn = invoices.find((invoice) => !invoice.grnNumber)
  if (missingGrn) {
    throw new ApiError(
      `Invoice ${missingGrn.invoiceNumber} cannot be submitted to finance without a GRN`,
      422,
    )
  }
  const cancelled = invoices.find((invoice) => !invoice.active)
  if (cancelled) {
    throw new ApiError(
      `Invoice ${cancelled.invoiceNumber} is cancelled and cannot be submitted to finance`,
      422,
    )
  }
  const alreadyBatched = invoices.find((invoice) => Boolean(invoice.listNo))
  if (alreadyBatched) {
    throw new ApiError(
      `Invoice ${alreadyBatched.invoiceNumber} has already been submitted to finance`,
      422,
    )
  }

  const [year, month] = payload.financeSubmitDate.split('-')
  const monthPrefix = `${year}/${month}/`
  const datePrefix = payload.financeSubmitDate.replaceAll('-', '/')
  const distinctListNumbersThisMonth = new Set(
    db.invoices
      .map((invoice) => invoice.listNo)
      .filter((listNo): listNo is string => Boolean(listNo) && listNo!.startsWith(monthPrefix)),
  ).size
  const listNo = `${datePrefix}/${String(distinctListNumbersThisMonth + 1).padStart(3, '0')}`
  const now = toIsoDate(new Date())

  // Every remaining step is a plain field assignment - none of it can throw, so once validation
  // above passes, the whole batch really does apply together.
  for (const invoice of invoices) {
    invoice.listNo = listNo
    invoice.financeSubmitDate = payload.financeSubmitDate
    invoice.updatedByUserId = payload.updatedByUserId
    invoice.updatedAt = now
  }

  return invoices
}

/** Distinct list numbers currently assigned, newest first - for the report screen's List No filter. */
export async function getDistinctListNumbers(): Promise<string[]> {
  await delay(150, 350)

  const listNumbers = new Set<string>()
  for (const invoice of db.invoices) {
    if (invoice.listNo) listNumbers.add(invoice.listNo)
  }
  return [...listNumbers].sort().reverse()
}
