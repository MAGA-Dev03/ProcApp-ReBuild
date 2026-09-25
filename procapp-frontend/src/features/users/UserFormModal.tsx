import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import type { User } from '@/types'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  TextField,
  MultiSelectField,
  ProjectAssignmentField,
  type ComboboxOption,
} from '@/components/form'

const baseUserFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string(),
  confirmPassword: z.string(),
  roleIds: z.array(z.string()),
  allProjects: z.boolean(),
  projectIds: z.array(z.string()),
  active: z.boolean(),
})

export type UserFormValues = z.infer<typeof baseUserFormSchema>

function buildUserFormSchema(mode: 'create' | 'edit') {
  return baseUserFormSchema.superRefine((values, ctx) => {
    const passwordProvided = mode === 'create' || values.password.length > 0
    if (!passwordProvided) return

    if (values.password.length < 8) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Password must be at least 8 characters',
      })
    }
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      })
    }
  })
}

const EMPTY_VALUES: UserFormValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  roleIds: [],
  allProjects: false,
  projectIds: [],
  active: true,
}

interface UserFormProps {
  user?: User
  roleOptions: ComboboxOption[]
  projectOptions: ComboboxOption[]
  onOpenChange: (open: boolean) => void
  onSubmit: (values: UserFormValues) => Promise<void>
  onRequestAddRole: () => void
  isSubmitting?: boolean
}

function UserForm({
  user,
  roleOptions,
  projectOptions,
  onOpenChange,
  onSubmit,
  onRequestAddRole,
  isSubmitting,
}: UserFormProps) {
  const [error, setFormLevelError] = useState<string | null>(null)
  const mode = user ? 'edit' : 'create'

  const {
    control,
    handleSubmit,
    setError: setFieldError,
  } = useForm<UserFormValues>({
    resolver: zodResolver(buildUserFormSchema(mode)),
    defaultValues: user
      ? {
          name: user.name,
          email: user.email,
          password: '',
          confirmPassword: '',
          roleIds: user.roles.map((role) => String(role.id)),
          allProjects: user.allProjects,
          projectIds: (user.projects ?? []).map((project) => String(project.id)),
          active: user.active,
        }
      : EMPTY_VALUES,
  })

  const allProjects = useWatch({ control, name: 'allProjects' })

  async function handleFormSubmit(values: UserFormValues) {
    setFormLevelError(null)
    try {
      await onSubmit(values)
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          setFieldError(field as keyof UserFormValues, { message })
        }
      } else {
        setFormLevelError('Could not save the user. Please try again.')
      }
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{user ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogDescription>
          {user ? `Editing ${user.email}` : 'Create a new user account.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
        <TextField control={control} name="name" label="Name" required />
        <TextField control={control} name="email" label="Email" type="email" required />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            control={control}
            name="password"
            label="Password"
            type="password"
            description={mode === 'edit' ? 'Leave blank to keep the existing password.' : undefined}
            required={mode === 'create'}
          />
          <TextField
            control={control}
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            required={mode === 'create'}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Roles</Label>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto gap-1 p-0 text-xs"
              onClick={onRequestAddRole}
            >
              <Plus className="size-3.5" /> Add new role
            </Button>
          </div>
          <MultiSelectField
            control={control}
            name="roleIds"
            options={roleOptions}
            placeholder="Select roles…"
          />
        </div>

        <Controller
          control={control}
          name="allProjects"
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              All projects (this user can see invoices across every project)
            </label>
          )}
        />

        {!allProjects && (
          <ProjectAssignmentField
            control={control}
            name="projectIds"
            options={projectOptions}
            label="Assigned Projects"
            description="Click a project to move it between the two lists. Zero assigned projects is allowed."
          />
        )}

        <Controller
          control={control}
          name="active"
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              Active (inactive users cannot log in)
            </label>
          )}
        />

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

interface UserFormModalProps {
  open: boolean
  user?: User | null
  roleOptions: ComboboxOption[]
  projectOptions: ComboboxOption[]
  onOpenChange: (open: boolean) => void
  onSubmit: (values: UserFormValues) => Promise<void>
  onRequestAddRole: () => void
  isSubmitting?: boolean
}

export function UserFormModal({
  open,
  user,
  roleOptions,
  projectOptions,
  onOpenChange,
  onSubmit,
  onRequestAddRole,
  isSubmitting,
}: UserFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {open && (
          <UserForm
            key={user?.id ?? 'create'}
            user={user ?? undefined}
            roleOptions={roleOptions}
            projectOptions={projectOptions}
            onOpenChange={onOpenChange}
            onSubmit={onSubmit}
            onRequestAddRole={onRequestAddRole}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
