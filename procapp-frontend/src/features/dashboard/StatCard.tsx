import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  label: string
  value: ReactNode
  icon: LucideIcon
  isLoading?: boolean
  isError?: boolean
  footer?: ReactNode
}

/** Compact scan-at-a-glance tile - not a chart, so no hover layer or legend, per the KPI-row
 * pattern (label + number + icon, nothing else competing for attention). */
export function StatCard({ label, value, icon: Icon, isLoading, isError, footer }: StatCardProps) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-1.5 h-5 w-20" />
          ) : isError ? (
            <p className="text-sm text-destructive">Couldn't load</p>
          ) : (
            <p className="truncate text-lg font-semibold tabular-nums">{value}</p>
          )}
          {!isLoading && !isError && footer}
        </div>
      </CardContent>
    </Card>
  )
}
