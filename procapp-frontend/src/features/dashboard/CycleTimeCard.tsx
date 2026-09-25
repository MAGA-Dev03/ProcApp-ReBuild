import { Clock, TrendingDown, TrendingUp } from 'lucide-react'
import type { CycleTimeStats } from '@/api/client'
import { StatCard } from './StatCard'

interface CycleTimeCardProps {
  data?: CycleTimeStats
  isLoading?: boolean
  isError?: boolean
}

/** Fewer days is better, so a month-over-month increase is flagged red and a decrease green -
 * the only place on this dashboard color carries a good/bad judgment rather than identity or
 * magnitude, so it's used sparingly and paired with the arrow + text, never color alone. */
export function CycleTimeCard({ data, isLoading, isError }: CycleTimeCardProps) {
  const trend =
    data?.currentMonthAverageDays != null && data?.previousMonthAverageDays != null
      ? data.currentMonthAverageDays - data.previousMonthAverageDays
      : null

  return (
    <StatCard
      label="Avg. Days to Submit"
      icon={Clock}
      isLoading={isLoading}
      isError={isError}
      value={data && `${data.averageDays.toFixed(1)} days`}
      footer={
        trend !== null && Math.abs(trend) >= 0.1 ? (
          <p
            className={
              trend > 0
                ? 'mt-0.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400'
                : 'mt-0.5 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400'
            }
          >
            {trend > 0 ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {Math.abs(trend).toFixed(1)} days vs last month
          </p>
        ) : null
      }
    />
  )
}
