import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Supplier } from '@/types'
import { ApiError } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TextField, TextareaField } from '@/components/form'

const supplierFormSchema = z.object({
  businessPartnerCode: z.string().min(1, 'Business partner code is required'),
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  contact: z.string().min(1, 'Contact is required'),
})

export type SupplierFormValues = z.infer<typeof supplierFormSchema>

const EMPTY_VALUES: SupplierFormValues = {
  businessPartnerCode: '',
  name: '',
  address: '',
  email: '',
  contact: '',
}

interface SupplierFormProps {
  supplier?: Supplier
  onOpenChange: (open: boolean) => void
  onSubmit: (values: SupplierFormValues) => Promise<void>
  isSubmitting?: boolean
}

function SupplierForm({ supplier, onOpenChange, onSubmit, isSubmitting }: SupplierFormProps) {
  const [error, setFormLevelError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    setError: setFieldError,
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: supplier
      ? {
          businessPartnerCode: supplier.businessPartnerCode,
          name: supplier.name,
          address: supplier.address,
          email: supplier.email,
          contact: supplier.contact,
        }
      : EMPTY_VALUES,
  })

  async function handleFormSubmit(values: SupplierFormValues) {
    setFormLevelError(null)
    try {
      await onSubmit(values)
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          setFieldError(field as keyof SupplierFormValues, { message })
        }
      } else {
        setFormLevelError('Could not save the supplier. Please try again.')
      }
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{supplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
        <DialogDescription>
          {supplier ? `Editing ${supplier.businessPartnerCode}` : 'Create a new supplier.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
        <TextField
          control={control}
          name="businessPartnerCode"
          label="Business Partner Code"
          required
        />
        <TextField control={control} name="name" label="Name" required />
        <TextareaField control={control} name="address" label="Address" required />
        <TextField control={control} name="email" label="Email" type="email" required />
        <TextField control={control} name="contact" label="Contact" required />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}

interface SupplierFormModalProps {
  open: boolean
  supplier?: Supplier | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: SupplierFormValues) => Promise<void>
  isSubmitting?: boolean
}

export function SupplierFormModal({
  open,
  supplier,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: SupplierFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <SupplierForm
            key={supplier?.id ?? 'create'}
            supplier={supplier ?? undefined}
            onOpenChange={onOpenChange}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
