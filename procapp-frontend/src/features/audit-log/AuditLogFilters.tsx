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
import { AUDIT_LOG_ACTIONS, type AuditLogAction } from '@/types'

const ALL_VALUE = '__all__'

const ACTION_LABEL: Record<AuditLogAction, string> = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  CANCEL: 'Cancel',
  ACTIVATE: 'Activate',
  SET_GRN: 'Set GRN',
  CLEAR_FINANCE_SUBMISSION: 'Clear From Finance',
  ADD_TO_FINANCE: 'Add To Finance',
  UPLOAD_ATTACHMENT: 'Upload Attachment',
}

const ACTION_OPTIONS = AUDIT_LOG_ACTIONS.map((action) => ({
  value: action,
  label: ACTION_LABEL[action],
}))

export interface AuditLogFiltersValue {
  action: string
  performedByUserId: string
  dateFrom: string
  dateTo: string
}

interface AuditLogFiltersProps {
  value: AuditLogFiltersValue
  onChange: (value: AuditLogFiltersValue) => void
  userOptions: ComboboxOption[]
}

export function AuditLogFilters({ value, onChange, userOptions }: AuditLogFiltersProps) {
  function set<K extends keyof AuditLogFiltersValue>(key: K, next: AuditLogFiltersValue[K]) {
    onChange({ ...value, [key]: next })
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="filter-action">Action</Label>
        <Select
          value={value.action || ALL_VALUE}
          onValueChange={(v) => set('action', v === ALL_VALUE ? '' : v)}
        >
          <SelectTrigger id="filter-action" className="w-48">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All actions</SelectItem>
            {ACTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <FilterCombobox
        id="filter-performed-by"
        label="Performed By"
        value={value.performedByUserId}
        onChange={(v) => set('performedByUserId', v)}
        options={userOptions}
        allLabel="All users"
        searchPlaceholder="Search users…"
        emptyMessage="No users found."
      />

      <div className="flex items-end gap-1.5">
        <div className="space-y-1.5">
          <Label htmlFor="filter-date-from">From</Label>
          <Input
            id="filter-date-from"
            type="date"
            className="w-40"
            value={value.dateFrom}
            onChange={(event) => set('dateFrom', event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-date-to">To</Label>
          <Input
            id="filter-date-to"
            type="date"
            className="w-40"
            value={value.dateTo}
            onChange={(event) => set('dateTo', event.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
