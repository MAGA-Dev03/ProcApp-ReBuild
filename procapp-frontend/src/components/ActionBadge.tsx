import type { AuditLogAction } from '@/types'
import { cn } from '@/lib/utils'

const ACTION_CONFIG: Record<AuditLogAction, { label: string; className: string }> = {
  CREATE: {
    label: 'Create',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  UPDATE: {
    label: 'Update',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  },
  DELETE: {
    label: 'Delete',
    className: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  },
  CANCEL: {
    label: 'Cancel',
    className: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  },
  ACTIVATE: {
    label: 'Activate',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  SET_GRN: {
    label: 'Set GRN',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  },
  CLEAR_FINANCE_SUBMISSION: {
    label: 'Clear From Finance',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  },
  ADD_TO_FINANCE: {
    label: 'Add To Finance',
    className: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
  },
  UPLOAD_ATTACHMENT: {
    label: 'Upload Attachment',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  },
}

interface ActionBadgeProps {
  action: AuditLogAction
  className?: string
}

export function ActionBadge({ action, className }: ActionBadgeProps) {
  const config = ACTION_CONFIG[action] ?? { label: action, className: 'bg-muted text-foreground' }
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
