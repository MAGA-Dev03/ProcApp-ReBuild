import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Textarea } from '@/components/ui/textarea'
import { FormFieldShell } from './FormFieldShell'

interface TextareaFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label?: string
  placeholder?: string
  description?: string
  required?: boolean
  rows?: number
  disabled?: boolean
}

export function TextareaField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  required,
  rows,
  disabled,
}: TextareaFieldProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldShell
          label={label}
          htmlFor={name}
          required={required}
          description={description}
          error={fieldState.error?.message}
        >
          <Textarea
            id={name}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            aria-invalid={Boolean(fieldState.error)}
            {...field}
            value={field.value ?? ''}
          />
        </FormFieldShell>
      )}
    />
  )
}
