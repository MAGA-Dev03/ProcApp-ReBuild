import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

interface FormFieldShellProps {
  label?: string
  htmlFor?: string
  required?: boolean
  description?: string
  error?: string
  children: ReactNode
}

export function FormFieldShell({
  label,
  htmlFor,
  required,
  description,
  error,
  children,
}: FormFieldShellProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      {children}
      {description && !error && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
