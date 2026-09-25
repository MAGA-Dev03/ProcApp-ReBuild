import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { ComboboxOption } from './ComboboxField'

interface FilterComboboxProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  /** Label for the "no filter" entry, also used as the trigger placeholder. */
  allLabel: string
  searchPlaceholder?: string
  emptyMessage?: string
  width?: string
}

/**
 * Searchable single-select filter (scroll + type-to-search) with an "all" reset
 * entry. Standalone control for filter bars, mirroring ComboboxField's UX.
 */
export function FilterCombobox({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results found.',
  width = 'w-48',
}: FilterComboboxProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(width, 'justify-between font-normal')}
          >
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>
              {selected ? selected.label : allLabel}
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
                <CommandItem
                  value={allLabel}
                  onSelect={() => {
                    onChange('')
                    setOpen(false)
                  }}
                >
                  <Check className={cn('mr-2 size-4', !value ? 'opacity-100' : 'opacity-0')} />
                  {allLabel}
                </CommandItem>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 size-4',
                        option.value === value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
