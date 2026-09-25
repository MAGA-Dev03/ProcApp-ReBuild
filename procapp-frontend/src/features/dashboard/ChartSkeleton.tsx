import { Skeleton } from '@/components/ui/skeleton'

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="space-y-3" style={{ height }}>
      <div className="flex items-end gap-2" style={{ height: height - 32 }}>
        {[65, 40, 80, 55, 90, 35, 70].map((pct, index) => (
          <Skeleton key={index} className="flex-1" style={{ height: `${pct}%` }} />
        ))}
      </div>
      <Skeleton className="h-3 w-1/3" />
    </div>
  )
}
