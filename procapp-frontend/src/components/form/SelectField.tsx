import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormFieldShell } from './FormFieldShell'

export interface SelectFieldOption {
  value: string
  label: string
}

interface SelectFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  options: SelectFieldOption[]
  label?: string
  placeholder?: string
  description?: string
  required?: boolean
  disabled?: boolean
}

export function SelectField<TFieldValues extends FieldValues>({
  control,
  name,
  options,
  label,
  placeholder,
  description,
  required,
  disabled,
}: SelectFieldProps<TFieldValues>) {
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
          <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={disabled}>
            <SelectTrigger id={name} className="w-full" aria-invalid={Boolean(fieldState.error)}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormFieldShell>
      )}
    />
  )
}
