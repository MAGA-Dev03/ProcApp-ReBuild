import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable } from '@/components/data-table'
import {
  ComboboxField,
  CurrencyField,
  DatePickerField,
  FileUploadField,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { INVOICE_STATUSES } from '@/lib/invoiceStatus'
import {
  SAMPLE_INVOICE_ROWS,
  SAMPLE_INVOICE_TYPE_OPTIONS,
  SAMPLE_PROJECT_OPTIONS,
  type SampleInvoiceRow,
} from './sampleData'

const columns: ColumnDef<SampleInvoiceRow, unknown>[] = [
  { accessorKey: 'invoiceNumber', header: 'Invoice #' },
  { accessorKey: 'project', header: 'Project' },
  { accessorKey: 'supplier', header: 'Supplier' },
  {
    accessorKey: 'value',
    header: 'Value',
    cell: ({ row }) => <CurrencyDisplay value={row.original.value} />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  { accessorKey: 'invoiceDate', header: 'Date' },
]

type TableDemoState = 'data' | 'loading' | 'empty' | 'error'

const formSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceType: z.string().min(1, 'Select an invoice type'),
  project: z.string().min(1, 'Select a project'),
  invoiceDate: z.string().min(1, 'Pick a date'),
  value: z.number().positive('Must be greater than zero').optional(),
  remarks: z.string().optional(),
  attachment: z.instanceof(File).nullable().optional(),
})

type FormValues = z.infer<typeof formSchema>

function DataTableSection() {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [sorting, setSorting] = useState<SortingState>([])
  const [search, setSearch] = useState('')
  const [demoState, setDemoState] = useState<TableDemoState>('data')
  const [pendingDelete, setPendingDelete] = useState<SampleInvoiceRow | null>(null)
  const debouncedSearch = useDebouncedValue(search, 300)

  const filtered = useMemo(() => {
    let rows = SAMPLE_INVOICE_ROWS
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      rows = rows.filter(
        (row) =>
          row.invoiceNumber.toLowerCase().includes(q) ||
          row.project.toLowerCase().includes(q) ||
          row.supplier.toLowerCase().includes(q),
      )
    }
    if (sorting.length > 0) {
      const [{ id, desc }] = sorting
      const key = id as keyof SampleInvoiceRow
      rows = [...rows].sort((a, b) => {
        if (a[key] < b[key]) return desc ? 1 : -1
        if (a[key] > b[key]) return desc ? -1 : 1
        return 0
      })
    }
    return rows
  }, [debouncedSearch, sorting])

  const pageRows = filtered.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)

  return (
    <Card>
      <CardHeader>
        <CardTitle>DataTable</CardTitle>
        <CardDescription>
          Server-side pagination/sorting are simulated locally here. Toggle the state buttons to
          preview the loading, empty, and error states.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['data', 'loading', 'empty', 'error'] as const).map((state) => (
            <Button
              key={state}
              type="button"
              size="sm"
              variant={demoState === state ? 'default' : 'outline'}
              onClick={() => setDemoState(state)}
            >
              {state}
            </Button>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={demoState === 'empty' ? [] : demoState === 'error' ? [] : pageRows}
          rowCount={demoState === 'empty' || demoState === 'error' ? 0 : filtered.length}
          pageIndex={pageIndex}
          pageSize={pageSize}
          onPageChange={setPageIndex}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPageIndex(0)
          }}
          sorting={sorting}
          onSortingChange={(next) => {
            setSorting(next)
            setPageIndex(0)
          }}
          searchValue={search}
          onSearchChange={(value) => {
            setSearch(value)
            setPageIndex(0)
          }}
          searchPlaceholder="Search invoice #, project, supplier…"
          getRowId={(row) => String(row.id)}
          rowActions={(row) => (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${row.invoiceNumber}`}
                onClick={() => alert(`Edit ${row.invoiceNumber}`)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${row.invoiceNumber}`}
                onClick={() => setPendingDelete(row)}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
          isLoading={demoState === 'loading'}
          isError={demoState === 'error'}
        />

        <ConfirmDialog
          open={pendingDelete !== null}
          onOpenChange={(open) => !open && setPendingDelete(null)}
          title={`Delete ${pendingDelete?.invoiceNumber}?`}
          description="This will permanently remove the invoice. This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }}
        />
      </CardContent>
    </Card>
  )
}

function ConfirmDialogSection() {
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>ConfirmDialog</CardTitle>
        <CardDescription>
          Requires an explicit confirm click; the confirm button disables itself mid-request so a
          double click can't fire the action twice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
          Cancel Invoice
        </Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Cancel this invoice?"
          description="The invoice will be marked cancelled but kept in the audit history."
          confirmLabel="Cancel Invoice"
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 700))
          }}
        />
      </CardContent>
    </Card>
  )
}

function DebouncedValueSection() {
  const [value, setValue] = useState('')
  const debounced = useDebouncedValue(value, 400)

  return (
    <Card>
      <CardHeader>
        <CardTitle>useDebouncedValue</CardTitle>
        <CardDescription>400ms debounce, typically used to gate a search request.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Type to see the debounce…"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="max-w-xs"
        />
        <div className="text-sm">
          <span className="text-muted-foreground">Raw:</span> {value || <em>empty</em>}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Debounced:</span> {debounced || <em>empty</em>}
        </div>
      </CardContent>
    </Card>
  )
}

function FormFieldsSection() {
  const [submitted, setSubmitted] = useState<FormValues | null>(null)

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      invoiceNumber: '',
      invoiceType: '',
      project: '',
      invoiceDate: '',
      value: undefined,
      remarks: '',
      attachment: null,
    },
  })

  const onSubmit = (values: FormValues) => {
    setSubmitted(values)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form fields</CardTitle>
        <CardDescription>
          React Hook Form + Zod, using every field wrapper in src/components/form.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <TextField control={control} name="invoiceNumber" label="Invoice Number" required />
          <SelectField
            control={control}
            name="invoiceType"
            label="Invoice Type"
            options={SAMPLE_INVOICE_TYPE_OPTIONS}
            placeholder="Select a type"
            required
          />
          <ComboboxField
            control={control}
            name="project"
            label="Project"
            options={SAMPLE_PROJECT_OPTIONS}
            placeholder="Select a project"
            searchPlaceholder="Search projects…"
            required
          />
          <DatePickerField control={control} name="invoiceDate" label="Invoice Date" required />
          <CurrencyField control={control} name="value" label="Value" placeholder="0.00" />
          <FileUploadField control={control} name="attachment" label="Attachment" />
          <div className="sm:col-span-2">
            <TextareaField
              control={control}
              name="remarks"
              label="Remarks"
              placeholder="Optional notes"
              rows={3}
            />
          </div>

          {submitted && (
            <Alert className="sm:col-span-2">
              <AlertTitle>Submitted</AlertTitle>
              <AlertDescription>
                <pre className="mt-2 max-w-full overflow-x-auto text-xs">
                  {JSON.stringify(
                    { ...submitted, attachment: submitted.attachment?.name ?? null },
                    null,
                    2,
                  )}
                </pre>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Submit</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                setSubmitted(null)
              }}
            >
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function StyleGuidePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Style Guide"
        description="Shared components rendered with sample data, for review in isolation before they're wired into real screens. Not linked in the sidebar."
      />

      <Card>
        <CardHeader>
          <CardTitle>StatusBadge</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {INVOICE_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CurrencyDisplay</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>
            <div className="text-muted-foreground">Default (LKR)</div>
            <CurrencyDisplay value={1284500.5} />
          </div>
          <div>
            <div className="text-muted-foreground">USD</div>
            <CurrencyDisplay value={4200} currency="USD" />
          </div>
          <div>
            <div className="text-muted-foreground">Zero</div>
            <CurrencyDisplay value={0} />
          </div>
        </CardContent>
      </Card>

      <DebouncedValueSection />
      <ConfirmDialogSection />
      <DataTableSection />
      <FormFieldsSection />
    </div>
  )
}
