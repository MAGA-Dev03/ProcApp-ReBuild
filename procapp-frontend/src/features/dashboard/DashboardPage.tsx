import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getAgingBuckets,
  getAverageCycleTimeDays,
  getDashboardSummary,
  getMonthlyInvoiceVolume,
  getReceivedVsSubmittedTrend,
  getRecentFinanceBatches,
  getTopSuppliersByPayable,
  type AgingBucketKey,
} from '@/api/client'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AgingBucketChart } from './AgingBucketChart'
import { AgingBucketDrilldownModal } from './AgingBucketDrilldownModal'
import { ChartCard } from './ChartCard'
import { CycleTimeCard } from './CycleTimeCard'
import { DashboardSummaryCards } from './DashboardSummaryCards'
import { MonthlyInvoiceVolumeChart } from './MonthlyInvoiceVolumeChart'
import { ReceivedVsSubmittedTrend } from './ReceivedVsSubmittedTrend'
import { RecentFinanceBatches } from './RecentFinanceBatches'
import { TopSuppliersDonut } from './TopSuppliersDonut'

export function DashboardPage() {
  const [selectedBucket, setSelectedBucket] = useState<AgingBucketKey | null>(null)

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
  })
  const cycleTimeQuery = useQuery({
    queryKey: ['dashboard', 'cycle-time'],
    queryFn: getAverageCycleTimeDays,
  })
  const agingQuery = useQuery({
    queryKey: ['dashboard', 'aging-buckets'],
    queryFn: getAgingBuckets,
  })
  const suppliersQuery = useQuery({
    queryKey: ['dashboard', 'top-suppliers'],
    queryFn: () => getTopSuppliersByPayable(10),
  })
  const trendQuery = useQuery({
    queryKey: ['dashboard', 'received-vs-submitted'],
    queryFn: getReceivedVsSubmittedTrend,
  })
  const volumeQuery = useQuery({
    queryKey: ['dashboard', 'monthly-volume'],
    queryFn: getMonthlyInvoiceVolume,
  })
  const recentBatchesQuery = useQuery({
    queryKey: ['dashboard', 'recent-finance-batches'],
    queryFn: () => getRecentFinanceBatches(10),
  })

  const agingIsEmpty = agingQuery.data?.every((bucket) => bucket.invoiceCount === 0) ?? false
  const trendIsEmpty =
    trendQuery.data?.every((point) => point.receivedValue === 0 && point.submittedValue === 0) ??
    false
  const volumeIsEmpty = volumeQuery.data?.every((point) => point.invoiceCount === 0) ?? false

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Outstanding receivables at a glance - aging, top suppliers by payable, and submission trend."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <DashboardSummaryCards
          data={summaryQuery.data}
          isLoading={summaryQuery.isLoading}
          isError={summaryQuery.isError}
        />
        <CycleTimeCard
          data={cycleTimeQuery.data}
          isLoading={cycleTimeQuery.isLoading}
          isError={cycleTimeQuery.isError}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <ChartCard
            title="Outstanding Invoices by Age"
            description="Click a bar to see which suppliers and projects make up that bucket."
            isLoading={agingQuery.isLoading}
            isError={agingQuery.isError}
            isEmpty={agingIsEmpty}
            emptyTitle="Nothing outstanding"
            emptyDescription="Every invoice has been submitted to finance or cancelled."
          >
            {agingQuery.data && (
              <AgingBucketChart data={agingQuery.data} onBucketClick={setSelectedBucket} />
            )}
          </ChartCard>
        </div>

        <div className="min-w-0">
          <ChartCard
            title="Top 10 Suppliers by Outstanding Payable"
            isLoading={suppliersQuery.isLoading}
            isError={suppliersQuery.isError}
            isEmpty={(suppliersQuery.data?.length ?? 0) === 0}
            emptyTitle="No outstanding payables"
            height={340}
          >
            {suppliersQuery.data && <TopSuppliersDonut data={suppliersQuery.data} />}
          </ChartCard>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Invoice Volume by Month"
          description="Trailing 12 months, by invoice count received."
          isLoading={volumeQuery.isLoading}
          isError={volumeQuery.isError}
          isEmpty={volumeIsEmpty}
          emptyTitle="No invoices received yet"
          height={280}
        >
          {volumeQuery.data && <MonthlyInvoiceVolumeChart data={volumeQuery.data} />}
        </ChartCard>

        <ChartCard
          title="Received vs Submitted"
          description="Trailing 12 months, by invoice value."
          isLoading={trendQuery.isLoading}
          isError={trendQuery.isError}
          isEmpty={trendIsEmpty}
          emptyTitle="No trend data yet"
          height={280}
        >
          {trendQuery.data && <ReceivedVsSubmittedTrend data={trendQuery.data} />}
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Finance Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBatchesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          ) : recentBatchesQuery.isError ? (
            <EmptyState
              title="Couldn't load recent batches"
              description="Something went wrong while fetching data. Try refreshing the page."
            />
          ) : (recentBatchesQuery.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No finance batches yet"
              description="Batches appear here once invoices are submitted from the Add to Finance screen."
            />
          ) : (
            <RecentFinanceBatches data={recentBatchesQuery.data!} />
          )}
        </CardContent>
      </Card>

      <AgingBucketDrilldownModal
        bucket={selectedBucket}
        onOpenChange={(open) => !open && setSelectedBucket(null)}
      />
    </div>
  )
}
