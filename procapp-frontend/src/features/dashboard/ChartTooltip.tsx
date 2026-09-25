import type { ReactNode } from 'react'

export function ChartTooltipContainer({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-popover-foreground shadow-md">
      {title && <div className="mb-1 text-xs font-medium">{title}</div>}
      <div className="space-y-1">{children}</div>
    </div>
  )
}

/** Value leads (Strong), series name follows (secondary) - matches how a reader scans a tooltip. */
export function ChartTooltipRow({
  colorVar,
  label,
  value,
}: {
  colorVar: string
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span
          className="inline-block h-0.5 w-3 rounded-full"
          style={{ backgroundColor: colorVar }}
        />
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}
