import { X } from 'lucide-react'
import type { InvoiceWithRelations } from '@/types'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import { EmptyState } from '@/components/EmptyState'

interface StagingPanelProps {
  invoices: InvoiceWithRelations[]
  onRemove: (id: number) => void
}

export function StagingPanel({ invoices, onRemove }: StagingPanelProps) {
  const total = invoices.reduce((sum, invoice) => sum + invoice.value, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'} selected
        </span>
        <span className="font-medium">
          <CurrencyDisplay value={total} />
        </span>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="Nothing staged yet"
          description="Add eligible invoices from the left to build this batch."
        />
      ) : (
        <div className="max-h-[480px] space-y-2 overflow-y-auto">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-medium">{invoice.invoiceNumber}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {invoice.project.name} · {invoice.supplier.name}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CurrencyDisplay value={invoice.value} className="text-sm" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${invoice.invoiceNumber}`}
                  onClick={() => onRemove(invoice.id)}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
