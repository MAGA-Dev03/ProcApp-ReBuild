import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthlyInvoiceVolume } from '@/api/client'
import { ChartTooltipContainer, ChartTooltipRow } from './ChartTooltip'

interface MonthlyInvoiceVolumeChartProps {
  data: MonthlyInvoiceVolume[]
}

/** Single series (invoice count, not value) - one categorical hue is enough, matching the "Received"
 * series color from the value-based trend chart below it so the two read as related. */
export function MonthlyInvoiceVolumeChart({ data }: MonthlyInvoiceVolumeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
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
          width={40}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const point = payload[0].payload as MonthlyInvoiceVolume
            return (
              <ChartTooltipContainer title={label as string}>
                <ChartTooltipRow
                  colorVar="var(--viz-cat-1)"
                  label="Invoices received"
                  value={String(point.invoiceCount)}
                />
              </ChartTooltipContainer>
            )
          }}
        />
        <Bar
          dataKey="invoiceCount"
          name="Invoices"
          fill="var(--viz-cat-1)"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
