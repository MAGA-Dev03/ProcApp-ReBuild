import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { TextField } from '@/components/form'
import type { Role } from '@/types'

const roleFormSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
})

type RoleFormValues = z.infer<typeof roleFormSchema>

interface AddRoleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: RoleFormValues) => Promise<Role>
  onCreated: (role: Role) => void
}

/** Small quick-action modal so an admin can add a role without leaving the Users screen. */
export function AddRoleModal({ open, onOpenChange, onSubmit, onCreated }: AddRoleModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    setError: setFieldError,
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: '' },
  })

  async function handleFormSubmit(values: RoleFormValues) {
    setError(null)
    setIsSubmitting(true)
    try {
      const role = await onSubmit(values)
      onCreated(role)
      reset({ name: '' })
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors?.name) {
        setFieldError('name', { message: err.fieldErrors.name })
      } else {
        setError('Could not create the role. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset({ name: '' })
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add New Role</DialogTitle>
          <DialogDescription>Creates a role that can be assigned to users.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
          <TextField control={control} name="name" label="Role Name" required />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
