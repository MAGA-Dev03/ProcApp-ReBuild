import { http } from './http'

export const AGING_BUCKET_KEYS = [
  '<30',
  '31-45',
  '46-60',
  '61-75',
  '76-90',
  '91-120',
  '120+',
] as const

export type AgingBucketKey = (typeof AGING_BUCKET_KEYS)[number]

export interface AgingBucket {
  bucket: AgingBucketKey
  totalValue: number
  invoiceCount: number
}

export interface AgingBreakdownRow {
  id: number
  name: string
  totalValue: number
  invoiceCount: number
}

export interface AgingBucketBreakdown {
  bucket: AgingBucketKey
  bySupplier: AgingBreakdownRow[]
  byProject: AgingBreakdownRow[]
}

export interface TopSupplier {
  supplierId: number
  supplierName: string
  outstandingValue: number
}

export interface TrendPoint {
  month: string
  monthLabel: string
  receivedValue: number
  submittedValue: number
}

export interface DashboardSummary {
  outstandingValue: number
  grnPendingCount: number
  readyToSubmitCount: number
  submittedThisMonthValue: number
}

export interface CycleTimeStats {
  averageDays: number
  currentMonthAverageDays: number | null
  previousMonthAverageDays: number | null
}

export interface MonthlyInvoiceVolume {
  month: string
  monthLabel: string
  invoiceCount: number
}

export interface FinanceBatchSummary {
  listNo: string
  financeSubmitDate: string
  invoiceCount: number
  totalValue: number
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })

/** "2025-03" -> "Mar 2025", matching the label the mock produced so charts read identically. */
function monthLabelFor(month: string): string {
  const [year, m] = month.split('-').map(Number)
  return MONTH_LABEL_FORMATTER.format(new Date(year, m - 1, 1))
}

export async function getAgingBuckets(): Promise<AgingBucket[]> {
  return http<AgingBucket[]>('/api/dashboard/aging-buckets')
}

export async function getAgingBucketBreakdown(
  bucket: AgingBucketKey,
): Promise<AgingBucketBreakdown> {
  return http<AgingBucketBreakdown>('/api/dashboard/aging-buckets/breakdown', {
    params: { bucket },
  })
}

export async function getTopSuppliersByPayable(limit = 10): Promise<TopSupplier[]> {
  return http<TopSupplier[]>('/api/dashboard/top-suppliers', { params: { limit } })
}

export async function getReceivedVsSubmittedTrend(): Promise<TrendPoint[]> {
  const raw = await http<Array<Omit<TrendPoint, 'monthLabel'>>>(
    '/api/dashboard/received-vs-submitted-trend',
  )
  return raw.map((point) => ({ ...point, monthLabel: monthLabelFor(point.month) }))
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return http<DashboardSummary>('/api/dashboard/summary')
}

export async function getAverageCycleTimeDays(): Promise<CycleTimeStats> {
  return http<CycleTimeStats>('/api/dashboard/cycle-time')
}

export async function getMonthlyInvoiceVolume(): Promise<MonthlyInvoiceVolume[]> {
  const raw = await http<Array<{ month: string; count: number }>>('/api/dashboard/monthly-volume')
  return raw.map(({ month, count }) => ({
    month,
    monthLabel: monthLabelFor(month),
    invoiceCount: count,
  }))
}

export async function getRecentFinanceBatches(limit = 10): Promise<FinanceBatchSummary[]> {
  const raw = await http<FinanceBatchSummary[]>('/api/dashboard/recent-finance-batches')
  return raw.slice(0, limit)
}
