import type { ComboboxOption } from '@/components/form'
import { FilterCombobox } from '@/components/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { INVOICE_SOURCE_OPTIONS, INVOICE_TYPE_OPTIONS } from './invoiceFormSchema'

const ALL_VALUE = '__all__'

const DATE_TYPE_OPTIONS = [
  { value: 'invoiceDate', label: 'Invoice Date' },
  { value: 'receivedDate', label: 'Invoice Received date' },
  { value: 'grnReceivedDate', label: 'GRN Received date' },
  { value: 'financeSubmitDate', label: 'Finance Submited date' },
]

const STATUS_OPTIONS = [
  { value: 'NOT_SUBMITTED', label: 'Not Submitted' },
  { value: 'GRN_PENDING', label: 'GRN Pending' },
  { value: 'GRN_RECEIVED', label: 'GRN Received' },
  { value: 'SUBMITTED', label: 'Submitted' },
]

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Cancelled' },
]

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  width = 'w-44',
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder: string
  width?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || ALL_VALUE} onValueChange={(v) => onChange(v === ALL_VALUE ? '' : v)}>
        <SelectTrigger id={id} className={width}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export interface ReportFiltersValue {
  invoiceType: string
  invoiceSource: string
  projectId: string
  supplierId: string
  month: string
  dateType: string
  dateExact: string
  reportStatus: string
  active: string
  listNo: string
}

interface ReportFiltersProps {
  value: ReportFiltersValue
  onChange: (value: ReportFiltersValue) => void
  projectOptions: ComboboxOption[]
  supplierOptions: ComboboxOption[]
  listNoOptions: ComboboxOption[]
}

export function ReportFilters({
  value,
  onChange,
  projectOptions,
  supplierOptions,
  listNoOptions,
}: ReportFiltersProps) {
  function set<K extends keyof ReportFiltersValue>(key: K, next: ReportFiltersValue[K]) {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterSelect
        id="filter-type"
        label="Type"
        value={value.invoiceType}
        onChange={(v) => set('invoiceType', v)}
        options={INVOICE_TYPE_OPTIONS}
        placeholder="All types"
        width="w-36"
      />
      <FilterSelect
        id="filter-source"
        label="Source"
        value={value.invoiceSource}
        onChange={(v) => set('invoiceSource', v)}
        options={INVOICE_SOURCE_OPTIONS}
        placeholder="All sources"
        width="w-36"
      />
      <FilterCombobox
        id="filter-project"
        label="Project"
        value={value.projectId}
        onChange={(v) => set('projectId', v)}
        options={projectOptions}
        allLabel="All projects"
        searchPlaceholder="Search projects…"
        emptyMessage="No projects found."
      />
      <FilterCombobox
        id="filter-supplier"
        label="Supplier"
        value={value.supplierId}
        onChange={(v) => set('supplierId', v)}
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
          value={value.month}
          onChange={(event) => set('month', event.target.value)}
        />
      </div>

      <div className="flex items-end gap-1.5">
        <FilterSelect
          id="filter-date-type"
          label="Date Type"
          value={value.dateType}
          onChange={(v) => set('dateType', v)}
          options={DATE_TYPE_OPTIONS}
          placeholder="Select Date type"
          width="w-40"
        />
        <div className="space-y-1.5">
          <Label htmlFor="filter-date-exact">On date</Label>
          <Input
            id="filter-date-exact"
            type="date"
            className="w-40"
            value={value.dateExact}
            onChange={(event) => set('dateExact', event.target.value)}
          />
        </div>
      </div>

      <FilterSelect
        id="filter-status"
        label="Status"
        value={value.reportStatus}
        onChange={(v) => set('reportStatus', v)}
        options={STATUS_OPTIONS}
        placeholder="All statuses"
      />
      <FilterSelect
        id="filter-active"
        label="Active/Cancelled"
        value={value.active}
        onChange={(v) => set('active', v)}
        options={ACTIVE_OPTIONS}
        placeholder="All"
      />
      <FilterCombobox
        id="filter-list-no"
        label="List No"
        value={value.listNo}
        onChange={(v) => set('listNo', v)}
        options={listNoOptions}
        allLabel="All list numbers"
        searchPlaceholder="Search list numbers…"
        emptyMessage="No list numbers found."
      />
    </div>
  )
}
