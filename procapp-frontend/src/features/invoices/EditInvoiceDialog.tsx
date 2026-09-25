import { useState } from 'react'
import type { InvoiceWithRelations } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { ComboboxOption } from '@/components/form'
import { InvoiceFormFields } from './InvoiceFormFields'
import type { InvoiceFormValues } from './invoiceFormSchema'

interface EditInvoiceDialogProps {
  invoice: InvoiceWithRelations | null
  projectOptions: ComboboxOption[]
  supplierOptions: ComboboxOption[]
  onOpenChange: (open: boolean) => void
  onSubmit: (values: InvoiceFormValues, attachmentRemoved: boolean) => Promise<void>
  isSubmitting?: boolean
  /** Only passed on the Submitted Invoices screen - "un-batches" the invoice back to pending. */
  onClearFromFinance?: () => Promise<void>
  isClearingFromFinance?: boolean
  /** Invoice is submitted to finance or cancelled - the backend rejects edits outright. */
  readOnly?: boolean
}

export function EditInvoiceDialog({
  invoice,
  projectOptions,
  supplierOptions,
  onOpenChange,
  onSubmit,
  isSubmitting,
  onClearFromFinance,
  isClearingFromFinance,
  readOnly,
}: EditInvoiceDialogProps) {
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  return (
    <Dialog open={invoice !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {invoice && (
          <>
            <DialogHeader>
              <DialogTitle>Edit Invoice</DialogTitle>
              <DialogDescription>{invoice.invoiceNumber}</DialogDescription>
            </DialogHeader>
            <InvoiceFormFields
              key={invoice.id}
              mode="edit"
              invoice={invoice}
              projectOptions={projectOptions}
              supplierOptions={supplierOptions}
              onSubmit={onSubmit}
              onCancelEdit={() => onOpenChange(false)}
              isSubmitting={isSubmitting}
              readOnly={readOnly}
              footerExtra={
                onClearFromFinance && (
                  <div className="ml-auto flex flex-col items-end gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isClearingFromFinance}
                      onClick={() => setClearConfirmOpen(true)}
                    >
                      Clear from finance list
                    </Button>
                    <p className="max-w-64 text-right text-xs text-muted-foreground">
                      No separate audit log entry - only this invoice's updatedAt/updatedBy fields
                      will show the change.
                    </p>
                  </div>
                )
              }
            />
            {onClearFromFinance && (
              <ConfirmDialog
                open={clearConfirmOpen}
                onOpenChange={setClearConfirmOpen}
                title="Clear from finance list?"
                description="This resets the list number and finance submit date, sending the invoice back to the pending Invoices screen. There is no separate audit trail for this action beyond the invoice's normal updatedAt/updatedBy fields."
                confirmLabel="Clear from Finance List"
                variant="default"
                onConfirm={async () => {
                  await onClearFromFinance()
                  onOpenChange(false)
                }}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
