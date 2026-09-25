import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Project } from '@/types'
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
import { TextField, SelectField } from '@/components/form'

const STATUS_OPTIONS = [
  { value: 'WORKING', label: 'Working' },
  { value: 'FINISHED', label: 'Finished' },
]

const projectFormSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  status: z.enum(['WORKING', 'FINISHED']),
  contractName: z.string().min(1, 'Contract name is required'),
})

export type ProjectFormValues = z.infer<typeof projectFormSchema>

const EMPTY_VALUES: ProjectFormValues = {
  code: '',
  name: '',
  status: 'WORKING',
  contractName: '',
}

interface ProjectFormProps {
  project?: Project
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ProjectFormValues) => Promise<void>
  isSubmitting?: boolean
}

function ProjectForm({ project, onOpenChange, onSubmit, isSubmitting }: ProjectFormProps) {
  const [error, setFormLevelError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    setError: setFieldError,
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: project
      ? {
          code: project.code,
          name: project.name,
          status: project.status,
          contractName: project.contractName,
        }
      : EMPTY_VALUES,
  })

  async function handleFormSubmit(values: ProjectFormValues) {
    setFormLevelError(null)
    try {
      await onSubmit(values)
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [field, message] of Object.entries(err.fieldErrors)) {
          setFieldError(field as keyof ProjectFormValues, { message })
        }
      } else {
        setFormLevelError('Could not save the project. Please try again.')
      }
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{project ? 'Edit Project' : 'Add Project'}</DialogTitle>
        <DialogDescription>
          {project ? `Editing ${project.code}` : 'Create a new project.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
        <TextField control={control} name="code" label="Code" required />
        <TextField control={control} name="name" label="Name" required />
        <SelectField
          control={control}
          name="status"
          label="Status"
          options={STATUS_OPTIONS}
          required
        />
        <TextField control={control} name="contractName" label="Contract Name" required />
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

interface ProjectFormModalProps {
  open: boolean
  project?: Project | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ProjectFormValues) => Promise<void>
  isSubmitting?: boolean
}

export function ProjectFormModal({
  open,
  project,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: ProjectFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (
          <ProjectForm
            key={project?.id ?? 'create'}
            project={project ?? undefined}
            onOpenChange={onOpenChange}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
