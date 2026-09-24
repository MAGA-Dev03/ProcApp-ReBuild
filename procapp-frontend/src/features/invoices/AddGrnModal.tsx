import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { InvoiceWithRelations } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TextField, DatePickerField } from '@/components/form'
import { REFERENCE_NUMBER_MESSAGE, REFERENCE_NUMBER_PATTERN } from './invoiceFormSchema'

const grnFormSchema = z.object({
  grnNumber: z
    .string()
    .min(1, 'GRN number is required')
    .regex(REFERENCE_NUMBER_PATTERN, REFERENCE_NUMBER_MESSAGE),
  pioNumber: z
    .string()
    .min(1, 'PIO number is required')
    .regex(REFERENCE_NUMBER_PATTERN, REFERENCE_NUMBER_MESSAGE),
  grnReceivedDate: z.string().min(1, 'GRN received date is required'),
})

export type GrnFormValues = z.infer<typeof grnFormSchema>

interface GrnFormProps {
  invoice: InvoiceWithRelations
  onOpenChange: (open: boolean) => void
  onSubmit: (values: GrnFormValues) => Promise<void>
  isSubmitting?: boolean
}

function GrnForm({ invoice, onOpenChange, onSubmit, isSubmitting }: GrnFormProps) {
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit } = useForm<GrnFormValues>({
    resolver: zodResolver(grnFormSchema),
    defaultValues: {
      grnNumber: invoice.grnNumber ?? '',
      pioNumber: invoice.pioNumber,
      grnReceivedDate: invoice.grnReceivedDate ?? '',
    },
  })

  async function handleFormSubmit(values: GrnFormValues) {
    setError(null)
    try {
      await onSubmit(values)
    } catch {
      setError('Could not save the GRN. Please try again.')
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add GRN</DialogTitle>
        <DialogDescription>Invoice {invoice.invoiceNumber}</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
        <TextField control={control} name="grnNumber" label="GRN No" required />
        <TextField control={control} name="pioNumber" label="PIO No" required />
        <DatePickerField
          control={control}
          name="grnReceivedDate"
          label="GRN Received Date"
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save GRN'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

interface AddGrnModalProps {
  invoice: InvoiceWithRelations | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: GrnFormValues) => Promise<void>
  isSubmitting?: boolean
}

export function AddGrnModal({ invoice, onOpenChange, onSubmit, isSubmitting }: AddGrnModalProps) {
  return (
    <Dialog open={invoice !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {invoice && (
          <GrnForm
            key={invoice.id}
            invoice={invoice}
            onOpenChange={onOpenChange}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
