import { Banknote, CalendarCheck2, ClipboardList, SendHorizontal } from 'lucide-react'
import type { DashboardSummary } from '@/api/client'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import { StatCard } from './StatCard'

interface DashboardSummaryCardsProps {
  data?: DashboardSummary
  isLoading?: boolean
  isError?: boolean
}

/** The four-card scan-at-a-glance row - each number is pre-aggregated server-side (see
 * `getDashboardSummary`), not computed from the full invoice list on the client. */
export function DashboardSummaryCards({ data, isLoading, isError }: DashboardSummaryCardsProps) {
  return (
    <>
      <StatCard
        label="Outstanding Value"
        icon={Banknote}
        isLoading={isLoading}
        isError={isError}
        value={data && <CurrencyDisplay value={data.outstandingValue} />}
      />
      <StatCard
        label="GRN Pending"
        icon={ClipboardList}
        isLoading={isLoading}
        isError={isError}
        value={data?.grnPendingCount}
      />
      <StatCard
        label="Ready to Submit"
        icon={SendHorizontal}
        isLoading={isLoading}
        isError={isError}
        value={data?.readyToSubmitCount}
      />
      <StatCard
        label="Submitted This Month"
        icon={CalendarCheck2}
        isLoading={isLoading}
        isError={isError}
        value={data && <CurrencyDisplay value={data.submittedThisMonthValue} />}
      />
    </>
  )
}
