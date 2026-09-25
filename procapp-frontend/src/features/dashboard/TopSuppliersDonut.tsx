import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { TopSupplier } from '@/api/client'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import { ChartTooltipContainer, ChartTooltipRow } from './ChartTooltip'

/** Ordinal blue ramp - rank 1 (largest payable) darkest, fading toward rank 10. */
const RANK_COLOR_VARS = Array.from({ length: 10 }, (_, i) => `var(--viz-rank-${i + 1})`)

interface TopSuppliersDonutProps {
  data: TopSupplier[]
}

export function TopSuppliersDonut({ data }: TopSuppliersDonutProps) {
  const total = data.reduce((sum, item) => sum + item.outstandingValue, 0)

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Pie
            data={data}
            dataKey="outstandingValue"
            nameKey="supplierName"
            innerRadius="55%"
            outerRadius="90%"
            paddingAngle={2}
            strokeWidth={2}
            stroke="var(--card)"
          >
            {data.map((entry, index) => (
              <Cell key={entry.supplierId} fill={RANK_COLOR_VARS[index % RANK_COLOR_VARS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const point = payload[0].payload as TopSupplier
              const share = total > 0 ? (point.outstandingValue / total) * 100 : 0
              return (
                <ChartTooltipContainer title={point.supplierName}>
                  <ChartTooltipRow
                    colorVar="var(--viz-rank-1)"
                    label="Outstanding"
                    value={<CurrencyDisplay value={point.outstandingValue} />}
                  />
                  <ChartTooltipRow
                    colorVar="var(--viz-rank-1)"
                    label="Share"
                    value={`${share.toFixed(1)}%`}
                  />
                </ChartTooltipContainer>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend doubles as the table view - every value here is also in the tooltip.
          Single column always: this card sits in a narrow grid track, so a viewport
          breakpoint (sm:) would force 2 columns regardless of the actual space available. */}
      <ul className="min-w-0 space-y-1.5">
        {data.map((supplier, index) => {
          const share = total > 0 ? (supplier.outstandingValue / total) * 100 : 0
          return (
            <li key={supplier.supplierId} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: RANK_COLOR_VARS[index % RANK_COLOR_VARS.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {supplier.supplierName}
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                <CurrencyDisplay value={supplier.outstandingValue} />
              </span>
              <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
                {share.toFixed(0)}%
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
