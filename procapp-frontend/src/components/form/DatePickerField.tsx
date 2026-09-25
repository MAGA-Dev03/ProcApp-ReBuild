import { useState } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { format, parseISO } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { FormFieldShell } from './FormFieldShell'

interface DatePickerFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label?: string
  placeholder?: string
  description?: string
  required?: boolean
  disabled?: boolean
}

/** Stores/reads dates as 'yyyy-MM-dd' strings, matching the API's date fields. */
export function DatePickerField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder = 'Pick a date',
  description,
  required,
  disabled,
}: DatePickerFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selectedDate: Date | undefined = field.value ? parseISO(field.value) : undefined

        return (
          <FormFieldShell
            label={label}
            htmlFor={name}
            required={required}
            description={description}
            error={fieldState.error?.message}
          >
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  id={name}
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  aria-invalid={Boolean(fieldState.error)}
                  className={cn(
                    'w-full justify-start font-normal',
                    !selectedDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {selectedDate ? format(selectedDate, 'PP') : placeholder}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    field.onChange(date ? format(date, 'yyyy-MM-dd') : null)
                    setOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </FormFieldShell>
        )
      }}
    />
  )
}
