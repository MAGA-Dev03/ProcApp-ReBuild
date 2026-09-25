import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TrendPoint } from '@/api/client'
import { formatCompactNumber, formatCurrency } from '@/lib/format'
import { ChartTooltipContainer, ChartTooltipRow } from './ChartTooltip'

interface ReceivedVsSubmittedTrendProps {
  data: TrendPoint[]
}

export function ReceivedVsSubmittedTrend({ data }: ReceivedVsSubmittedTrendProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="monthLabel"
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          tickFormatter={(value: number) => formatCompactNumber(value)}
          width={52}
        />
        <Tooltip
          cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <ChartTooltipContainer title={label as string}>
                {payload.map((entry) => (
                  <ChartTooltipRow
                    key={entry.dataKey as string}
                    colorVar={entry.color ?? 'var(--viz-cat-1)'}
                    label={entry.name as string}
                    value={formatCurrency(entry.value as number)}
                  />
                ))}
              </ChartTooltipContainer>
            )
          }}
        />
        <Legend
          verticalAlign="top"
          height={32}
          content={({ payload }) => (
            <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
              {payload?.map((entry) => (
                <span key={entry.value} className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-0.5 w-4 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.value}
                </span>
              ))}
            </div>
          )}
        />
        <Line
          type="monotone"
          dataKey="receivedValue"
          name="Received"
          stroke="var(--viz-cat-1)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
        />
        <Line
          type="monotone"
          dataKey="submittedValue"
          name="Submitted"
          stroke="var(--viz-cat-2)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
