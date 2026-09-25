import type { InvoiceStatus } from '@/lib/invoiceStatus'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  OPEN: {
    label: 'Open',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  },
  GRN_PENDING: {
    label: 'GRN Pending',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  },
  GRN_RECEIVED: {
    label: 'GRN Received',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  },
  SUBMITTED: {
    label: 'Submitted',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  },
}

interface StatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  )
}
