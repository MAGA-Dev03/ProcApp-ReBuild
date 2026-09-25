import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { FormFieldShell } from './FormFieldShell'

interface CurrencyFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label?: string
  placeholder?: string
  description?: string
  required?: boolean
  currency?: string
  disabled?: boolean
}

export function CurrencyField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  required,
  currency = 'LKR',
  disabled,
}: CurrencyFieldProps<TFieldValues>) {
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
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
              {currency}
            </span>
            <Input
              id={name}
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder={placeholder}
              disabled={disabled}
              aria-invalid={Boolean(fieldState.error)}
              className="pl-12"
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value ?? ''}
              onChange={(event) => {
                const raw = event.target.value
                field.onChange(raw === '' ? undefined : Number(raw))
              }}
            />
          </div>
        </FormFieldShell>
      )}
    />
  )
}
