import type { ComboboxOption } from '@/components/form'
import { FilterCombobox } from '@/components/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface InvoicesFiltersProps {
  projectOptions: ComboboxOption[]
  supplierOptions: ComboboxOption[]
  projectId: string
  onProjectIdChange: (value: string) => void
  supplierId: string
  onSupplierIdChange: (value: string) => void
  month: string
  onMonthChange: (value: string) => void
}

export function InvoicesFilters({
  projectOptions,
  supplierOptions,
  projectId,
  onProjectIdChange,
  supplierId,
  onSupplierIdChange,
  month,
  onMonthChange,
}: InvoicesFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterCombobox
        id="filter-project"
        label="Project"
        value={projectId}
        onChange={onProjectIdChange}
        options={projectOptions}
        allLabel="All projects"
        searchPlaceholder="Search projects…"
        emptyMessage="No projects found."
      />

      <FilterCombobox
        id="filter-supplier"
        label="Supplier"
        value={supplierId}
        onChange={onSupplierIdChange}
        options={supplierOptions}
        allLabel="All suppliers"
        searchPlaceholder="Search suppliers…"
        emptyMessage="No suppliers found."
      />

      <div className="space-y-1.5">
        <Label htmlFor="filter-month">Received in</Label>
        <Input
          id="filter-month"
          type="month"
          className="w-40"
          value={month}
          onChange={(event) => onMonthChange(event.target.value)}
        />
      </div>
    </div>
  )
}
