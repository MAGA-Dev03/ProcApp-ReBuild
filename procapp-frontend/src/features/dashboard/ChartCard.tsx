import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { ChartSkeleton } from './ChartSkeleton'

interface ChartCardProps {
  title: string
  description?: string
  isLoading?: boolean
  isError?: boolean
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  height?: number
  children: ReactNode
}

export function ChartCard({
  title,
  description,
  isLoading,
  isError,
  isEmpty,
  emptyTitle = 'No data yet',
  emptyDescription,
  height = 280,
  children,
}: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ChartSkeleton height={height} />
        ) : isError ? (
          <div style={{ height }} className="flex items-center justify-center">
            <EmptyState
              icon={AlertTriangle}
              title="Couldn't load this chart"
              description="Something went wrong while fetching data. Try refreshing the page."
            />
          </div>
        ) : isEmpty ? (
          <div style={{ height }} className="flex items-center justify-center">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
