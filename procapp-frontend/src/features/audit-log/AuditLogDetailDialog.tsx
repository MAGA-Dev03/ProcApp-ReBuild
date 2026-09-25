import type { AuditLogEntry } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ActionBadge } from '@/components/ActionBadge'

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

/** Renders before/after as a field-by-field table, highlighting the fields that actually
 * changed - a raw JSON dump is correct but much harder to scan at a glance. */
function FieldDiff({
  before,
  after,
}: {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}) {
  const fields = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]))

  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground">No field data recorded.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs text-muted-foreground">
          <th className="py-1.5 pr-2 font-medium">Field</th>
          <th className="py-1.5 pr-2 font-medium">Before</th>
          <th className="py-1.5 font-medium">After</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((field) => {
          const beforeValue = before ? before[field] : undefined
          const afterValue = after ? after[field] : undefined
          const changed = before !== null && after !== null && beforeValue !== afterValue
          return (
            <tr key={field} className="border-b last:border-0">
              <td className="py-1.5 pr-2 font-mono text-xs text-muted-foreground">{field}</td>
              <td
                className={changed ? 'py-1.5 pr-2 text-red-700 dark:text-red-400' : 'py-1.5 pr-2'}
              >
                {formatValue(beforeValue)}
              </td>
              <td
                className={
                  changed ? 'py-1.5 text-emerald-700 dark:text-emerald-400' : 'py-1.5'
                }
              >
                {formatValue(afterValue)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

interface AuditLogDetailDialogProps {
  entry: AuditLogEntry | null
  onOpenChange: (open: boolean) => void
}

export function AuditLogDetailDialog({ entry, onOpenChange }: AuditLogDetailDialogProps) {
  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ActionBadge action={entry.action} />
                <span>{entry.invoiceNumber ?? `Invoice #${entry.invoiceId} (deleted)`}</span>
              </DialogTitle>
              <DialogDescription>
                {entry.performedByName ?? 'Unknown user'} ·{' '}
                {new Date(entry.performedAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <FieldDiff before={parseJson(entry.beforeData)} after={parseJson(entry.afterData)} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
