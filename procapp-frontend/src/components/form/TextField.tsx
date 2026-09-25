import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormFieldShell } from './FormFieldShell'

interface TextFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label?: string
  placeholder?: string
  description?: string
  required?: boolean
  type?: 'text' | 'email' | 'password' | 'tel'
  disabled?: boolean
}

export function TextField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  required,
  type = 'text',
  disabled,
}: TextFieldProps<TFieldValues>) {
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
          <Input
            id={name}
            type={type}
            placeholder={placeholder}
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
