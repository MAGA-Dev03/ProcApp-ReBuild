import type { Page, PageParams, Supplier } from '@/types'
import { ApiError } from '../apiError'
import { db, nextSupplierId } from './db'
import { delay, paginate } from './utils'

export interface ListSuppliersParams extends PageParams {
  search?: string
}

export type CreateSupplierPayload = Pick<
  Supplier,
  'businessPartnerCode' | 'name' | 'address' | 'email' | 'contact'
>
export type UpdateSupplierPayload = Partial<CreateSupplierPayload>

export async function listSuppliers(params: ListSuppliersParams = {}): Promise<Page<Supplier>> {
  await delay()

  let results = db.suppliers
  if (params.search) {
    const search = params.search.toLowerCase()
    results = results.filter(
      (supplier) =>
        supplier.name.toLowerCase().includes(search) ||
        supplier.businessPartnerCode.toLowerCase().includes(search),
    )
  }

  return paginate(results, params)
}

function findSupplierOrThrow(id: number): Supplier {
  const supplier = db.suppliers.find((s) => s.id === id)
  if (!supplier) {
    throw new ApiError(`Supplier ${id} not found`, 404)
  }
  return supplier
}

export async function getSupplier(id: number): Promise<Supplier> {
  await delay()
  return findSupplierOrThrow(id)
}

function assertUniqueFields(
  fields: { businessPartnerCode: string; email: string },
  excludeId?: number,
): void {
  const code = fields.businessPartnerCode.trim().toLowerCase()
  const email = fields.email.trim().toLowerCase()

  if (
    db.suppliers.some(
      (s) => s.id !== excludeId && s.businessPartnerCode.trim().toLowerCase() === code,
    )
  ) {
    throw new ApiError('Validation failed', 422, {
      businessPartnerCode: 'A supplier with this business partner code already exists.',
    })
  }
  if (db.suppliers.some((s) => s.id !== excludeId && s.email.trim().toLowerCase() === email)) {
    throw new ApiError('Validation failed', 422, {
      email: 'A supplier with this email already exists.',
    })
  }
}

export async function createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
  await delay()

  assertUniqueFields(payload)

  const supplier: Supplier = {
    id: nextSupplierId(),
    businessPartnerCode: payload.businessPartnerCode,
    name: payload.name,
    address: payload.address,
    email: payload.email,
    contact: payload.contact,
  }
  db.suppliers.push(supplier)
  return supplier
}

export async function updateSupplier(
  id: number,
  payload: UpdateSupplierPayload,
): Promise<Supplier> {
  await delay()

  const supplier = findSupplierOrThrow(id)
  assertUniqueFields(
    {
      businessPartnerCode: payload.businessPartnerCode ?? supplier.businessPartnerCode,
      email: payload.email ?? supplier.email,
    },
    id,
  )

  const updated: Supplier = { ...supplier, ...payload, id: supplier.id }
  const index = db.suppliers.findIndex((s) => s.id === id)
  db.suppliers[index] = updated
  return updated
}

/**
 * Blocked, not cascaded: a supplier referenced by invoices can't be deleted, mirroring a real
 * foreign-key constraint. The error message names the count so the UI can explain why, rather than
 * failing silently or with a generic message.
 */
export async function deleteSupplier(id: number): Promise<void> {
  await delay()

  findSupplierOrThrow(id)
  const invoiceCount = db.invoices.filter((inv) => inv.supplierId === id).length
  if (invoiceCount > 0) {
    throw new ApiError(
      `This supplier can't be deleted because ${invoiceCount} invoice${invoiceCount === 1 ? ' references' : 's reference'} it. Remove or reassign those invoices first.`,
      409,
    )
  }

  const index = db.suppliers.findIndex((s) => s.id === id)
  db.suppliers.splice(index, 1)
}
