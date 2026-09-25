import type { InvoiceStatus } from '@/lib/invoiceStatus'

export interface SampleInvoiceRow {
  id: number
  invoiceNumber: string
  project: string
  supplier: string
  value: number
  status: InvoiceStatus
  invoiceDate: string
}

const PROJECTS = [
  'Colombo City Tower Phase 1',
  'Kandy Multi-Complex Development',
  'Galle Face Residencies',
  'Negombo Beach Resort',
  'Kurunegala Industrial Park',
]

const SUPPLIERS = [
  'Lanka Hardware (Pvt) Ltd',
  'Ceylon Steel Corporation',
  'Colombo Cement Traders',
  'Kandy Electrical Supplies',
  'Southern Timber Mills',
]

const STATUSES: InvoiceStatus[] = ['OPEN', 'GRN_PENDING', 'GRN_RECEIVED', 'SUBMITTED', 'CANCELLED']

export const SAMPLE_INVOICE_ROWS: SampleInvoiceRow[] = Array.from({ length: 47 }, (_, index) => ({
  id: index + 1,
  invoiceNumber: `INV-${String(1000 + index)}`,
  project: PROJECTS[index % PROJECTS.length],
  supplier: SUPPLIERS[index % SUPPLIERS.length],
  value: 15_000 + index * 8_231,
  status: STATUSES[index % STATUSES.length],
  invoiceDate: `2026-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`,
}))

export const SAMPLE_PROJECT_OPTIONS = PROJECTS.map((name, index) => ({
  value: String(index + 1),
  label: name,
}))

export const SAMPLE_INVOICE_TYPE_OPTIONS = [
  { value: 'CREDIT', label: 'Credit' },
  { value: 'ADVANCE', label: 'Advance' },
  { value: 'LC', label: 'Letter of Credit' },
]
