import { useState } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormFieldShell } from './FormFieldShell'
import type { ComboboxOption } from './ComboboxField'

interface ProjectAssignmentFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  options: ComboboxOption[]
  label?: string
  description?: string
  disabled?: boolean
}

function ListBox({
  title,
  items,
  search,
  onSearchChange,
  onItemClick,
  moveAllLabel,
  onMoveAll,
  moveIcon,
  emptyMessage,
  disabled,
}: {
  title: string
  items: ComboboxOption[]
  search: string
  onSearchChange: (value: string) => void
  onItemClick: (value: string) => void
  moveAllLabel: string
  onMoveAll: () => void
  moveIcon: 'left' | 'right'
  emptyMessage: string
  disabled?: boolean
}) {
  const filtered = items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-w-0 flex-1 rounded-lg border border-border">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="text-sm font-medium">
          {title} <span className="text-muted-foreground">({items.length})</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-xs"
          disabled={disabled || items.length === 0}
          onClick={onMoveAll}
        >
          {moveIcon === 'right' ? (
            <ChevronsRight className="size-3.5" />
          ) : (
            <ChevronsLeft className="size-3.5" />
          )}
          {moveAllLabel}
        </Button>
      </div>
      <div className="p-2">
        <Input
          className="h-8"
          placeholder="Search…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="h-48 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <p className="p-2 text-center text-xs text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((item) => (
              <li key={item.value}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onItemClick(item.value)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {moveIcon === 'right' ? (
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Dual-list-box project assignment picker: click a project in "Available" to assign it, click one
 * in "Assigned" to remove it. Value is a `string[]` of assigned project ids. */
export function ProjectAssignmentField<TFieldValues extends FieldValues>({
  control,
  name,
  options,
  label,
  description,
  disabled,
}: ProjectAssignmentFieldProps<TFieldValues>) {
  const [availableSearch, setAvailableSearch] = useState('')
  const [assignedSearch, setAssignedSearch] = useState('')

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const assignedValues: string[] = field.value ?? []
        const assignedSet = new Set(assignedValues)

        const available = options.filter((option) => !assignedSet.has(option.value))
        const assigned = options.filter((option) => assignedSet.has(option.value))

        return (
          <FormFieldShell label={label} description={description} error={fieldState.error?.message}>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <ListBox
                title="Available"
                items={available}
                search={availableSearch}
                onSearchChange={setAvailableSearch}
                onItemClick={(value) => field.onChange([...assignedValues, value])}
                moveAllLabel="Add all"
                onMoveAll={() => field.onChange(options.map((o) => o.value))}
                moveIcon="right"
                emptyMessage="No projects available."
                disabled={disabled}
              />
              <ListBox
                title="Assigned"
                items={assigned}
                search={assignedSearch}
                onSearchChange={setAssignedSearch}
                onItemClick={(value) => field.onChange(assignedValues.filter((v) => v !== value))}
                moveAllLabel="Remove all"
                onMoveAll={() => field.onChange([])}
                moveIcon="left"
                emptyMessage="No projects assigned."
                disabled={disabled}
              />
            </div>
          </FormFieldShell>
        )
      }}
    />
  )
}
