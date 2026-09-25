import { z } from 'zod'

export const INVOICE_TYPE_OPTIONS = [
  { value: 'CREDIT', label: 'Credit' },
  { value: 'ADVANCE', label: 'Advance' },
  { value: 'LC', label: 'Letter of Credit' },
]

export const INVOICE_SOURCE_OPTIONS = [
  { value: 'DIRECT', label: 'Direct' },
  { value: 'STORES', label: 'Stores' },
  { value: 'PROJECT', label: 'Project' },
]

/** Mirrors InvoiceRequest.REFERENCE_NUMBER_PATTERN on the backend (F-17): no leading =, +, -, @
 * etc. that a spreadsheet would run as a formula when the report is exported. */
export const REFERENCE_NUMBER_PATTERN = /^ *$|^ *[A-Za-z0-9][^\p{Cc}]*$/u
export const REFERENCE_NUMBER_MESSAGE = 'Must start with a letter or digit'

export const invoiceFormSchema = z.object({
  invoiceType: z.string().min(1, 'Select an invoice type'),
  invoiceSource: z.string().min(1, 'Select an invoice source'),
  projectId: z.string().min(1, 'Select a project'),
  supplierId: z.string().min(1, 'Select a supplier'),
  invoiceNumber: z
    .string()
    .min(1, 'Invoice number is required')
    .regex(REFERENCE_NUMBER_PATTERN, REFERENCE_NUMBER_MESSAGE),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  receivedDate: z.string().min(1, 'Received date is required'),
  purchaseOrderNumber: z
    .string()
    .min(1, 'PO number is required')
    .regex(REFERENCE_NUMBER_PATTERN, REFERENCE_NUMBER_MESSAGE),
  value: z
    .number()
    .optional()
    .refine((v) => v !== undefined, { message: 'Value is required' })
    .refine((v) => v === undefined || v > 0, { message: 'Value must be greater than zero' }),
  // Optional: some invoices don't have a PIO number yet when first added; it can be
  // filled in later (edit, or the Add GRN step).
  pioNumber: z.string().regex(REFERENCE_NUMBER_PATTERN, REFERENCE_NUMBER_MESSAGE),
  grnNumber: z.string().regex(REFERENCE_NUMBER_PATTERN, REFERENCE_NUMBER_MESSAGE).optional(),
  grnReceivedDate: z.string().optional(),
  attachment: z.instanceof(File).nullable().optional(),
  remarks: z.string().optional(),
})

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

export const FREEZABLE_FIELDS = [
  'invoiceType',
  'invoiceSource',
  'projectId',
  'supplierId',
  'invoiceDate',
  'receivedDate',
] as const satisfies ReadonlyArray<keyof InvoiceFormValues>

export type FreezableField = (typeof FREEZABLE_FIELDS)[number]

export const EMPTY_INVOICE_FORM_VALUES: InvoiceFormValues = {
  invoiceType: '',
  invoiceSource: '',
  projectId: '',
  supplierId: '',
  invoiceNumber: '',
  invoiceDate: '',
  receivedDate: '',
  purchaseOrderNumber: '',
  value: undefined,
  pioNumber: '',
  grnNumber: '',
  grnReceivedDate: '',
  attachment: null,
  remarks: '',
}
