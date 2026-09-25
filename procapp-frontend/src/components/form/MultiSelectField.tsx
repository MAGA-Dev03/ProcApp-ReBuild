import { useState } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { FormFieldShell } from './FormFieldShell'
import type { ComboboxOption } from './ComboboxField'

interface MultiSelectFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  options: ComboboxOption[]
  label?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  description?: string
  required?: boolean
  disabled?: boolean
}

/** Checkbox-style multi-select, e.g. for a user's assigned roles. Value is a `string[]` of option
 * values; selections are shown as removable badges below the trigger. */
export function MultiSelectField<TFieldValues extends FieldValues>({
  control,
  name,
  options,
  label,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results found.',
  description,
  required,
  disabled,
}: MultiSelectFieldProps<TFieldValues>) {
  const [open, setOpen] = useState(false)

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selectedValues: string[] = field.value ?? []
        const selectedOptions = options.filter((option) => selectedValues.includes(option.value))

        function toggle(value: string) {
          const next = selectedValues.includes(value)
            ? selectedValues.filter((v) => v !== value)
            : [...selectedValues, value]
          field.onChange(next)
        }

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
                  role="combobox"
                  aria-expanded={open}
                  aria-invalid={Boolean(fieldState.error)}
                  disabled={disabled}
                  className="w-full justify-between font-normal"
                >
                  <span
                    className={cn(
                      'truncate',
                      selectedOptions.length === 0 && 'text-muted-foreground',
                    )}
                  >
                    {selectedOptions.length > 0
                      ? `${selectedOptions.length} selected`
                      : placeholder}
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                <Command>
                  <CommandInput placeholder={searchPlaceholder} />
                  <CommandList>
                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                    <CommandGroup>
                      {options.map((option) => {
                        const checked = selectedValues.includes(option.value)
                        return (
                          <CommandItem
                            key={option.value}
                            value={option.label}
                            onSelect={() => toggle(option.value)}
                          >
                            <Check
                              className={cn('mr-2 size-4', checked ? 'opacity-100' : 'opacity-0')}
                            />
                            {option.label}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedOptions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedOptions.map((option) => (
                  <Badge key={option.value} variant="secondary" className="gap-1">
                    {option.label}
                    {!disabled && (
                      <button
                        type="button"
                        aria-label={`Remove ${option.label}`}
                        onClick={() => toggle(option.value)}
                        className="rounded-full hover:bg-muted-foreground/20"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </FormFieldShell>
        )
      }}
    />
  )
}
