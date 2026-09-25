import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AgingBucket, AgingBucketKey } from '@/api/client'
import { formatCompactNumber, formatCurrency } from '@/lib/format'
import { ChartTooltipContainer, ChartTooltipRow } from './ChartTooltip'

/** Ordinal blue ramp, light -> dark - bucket order is escalating aging risk, not identity. */
const BUCKET_COLOR_VARS = [
  'var(--viz-aging-1)',
  'var(--viz-aging-2)',
  'var(--viz-aging-3)',
  'var(--viz-aging-4)',
  'var(--viz-aging-5)',
  'var(--viz-aging-6)',
  'var(--viz-aging-7)',
]

interface AgingBucketChartProps {
  data: AgingBucket[]
  onBucketClick: (bucket: AgingBucketKey) => void
}

export function AgingBucketChart({ data, onBucketClick }: AgingBucketChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          tickFormatter={(value: number) => formatCompactNumber(value)}
          width={52}
        />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const point = payload[0].payload as AgingBucket
            return (
              <ChartTooltipContainer title={`${point.bucket} days`}>
                <ChartTooltipRow
                  colorVar="var(--viz-aging-4)"
                  label="Outstanding value"
                  value={formatCurrency(point.totalValue)}
                />
                <ChartTooltipRow
                  colorVar="var(--viz-aging-4)"
                  label="Invoices"
                  value={String(point.invoiceCount)}
                />
              </ChartTooltipContainer>
            )
          }}
        />
        <Bar
          dataKey="totalValue"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
          className="cursor-pointer"
          onClick={(entry) => onBucketClick((entry as unknown as AgingBucket).bucket)}
        >
          {data.map((entry, index) => (
            <Cell key={entry.bucket} fill={BUCKET_COLOR_VARS[index % BUCKET_COLOR_VARS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
