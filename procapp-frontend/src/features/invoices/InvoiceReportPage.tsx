import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import type { SortingState } from '@tanstack/react-table'
import { Clipboard, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import {
  getDistinctListNumbers,
  listAllProjects,
  listAllSuppliers,
  listInvoices,
  type ListInvoicesParams,
} from '@/api/client'
import type { InvoiceSource, InvoiceType } from '@/types'
import { PageHeader } from '@/components/PageHeader'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { FinanceReportModal } from './FinanceReportModal'
import { invoiceReportColumns } from './invoiceReportColumns'
import {
  copyRowsToClipboard,
  exportRowsToCsv,
  exportRowsToExcel,
  printRows,
  toReportRow,
} from './reportExport'
import { ReportFilters, type ReportFiltersValue } from './ReportFilters'
import { toSortParam } from './sortParam'

const PAGE_SIZE = 15

const EMPTY_FILTERS: ReportFiltersValue = {
  invoiceType: '',
  invoiceSource: '',
  projectId: '',
  supplierId: '',
  month: '',
  dateType: '',
  dateExact: '',
  reportStatus: '',
  active: '',
  listNo: '',
}

function monthToRange(month: string): { from: string; to: string } | null {
  if (!month) return null
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` }
}

function toListInvoicesParams(
  filters: ReportFiltersValue,
): Omit<ListInvoicesParams, 'page' | 'size'> {
  const monthRange = monthToRange(filters.month)
  return {
    invoiceType: (filters.invoiceType as InvoiceType) || undefined,
    invoiceSource: (filters.invoiceSource as InvoiceSource) || undefined,
    projectId: filters.projectId ? Number(filters.projectId) : undefined,
    supplierId: filters.supplierId ? Number(filters.supplierId) : undefined,
    receivedDateFrom: monthRange?.from,
    receivedDateTo: monthRange?.to,
    dateType: (filters.dateType as ListInvoicesParams['dateType']) || undefined,
    dateExact: filters.dateExact || undefined,
    reportStatus: (filters.reportStatus as ListInvoicesParams['reportStatus']) || undefined,
    active: filters.active ? filters.active === 'true' : undefined,
    listNo: filters.listNo || undefined,
  }
}

export function InvoiceReportPage() {
  // The dashboard's "Recent Finance Batches" feed links here with a listNo pre-selected via
  // router state (not a URL query param - this is an internal SPA handoff, not a bookmarkable
  // link), so the manager lands straight on that batch's report instead of an empty filter set.
  const location = useLocation()
  const initialListNo = (location.state as { listNo?: string } | null)?.listNo ?? ''
  const [filters, setFilters] = useState<ReportFiltersValue>({
    ...EMPTY_FILTERS,
    listNo: initialListNo,
  })
  const debouncedFilters = useDebouncedValue(filters, 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'receivedDate', desc: true }])
  const [pageIndex, setPageIndex] = useState(0)
  const [financeReportListNo, setFinanceReportListNo] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const projectsQuery = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: listAllProjects,
  })
  const suppliersQuery = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: listAllSuppliers,
  })
  const listNumbersQuery = useQuery({
    queryKey: ['invoices', 'distinct-list-numbers'],
    queryFn: getDistinctListNumbers,
  })

  const projectOptions = useMemo(
    () => (projectsQuery.data ?? []).map((p) => ({ value: String(p.id), label: p.name })),
    [projectsQuery.data],
  )
  const supplierOptions = useMemo(
    () => (suppliersQuery.data ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    [suppliersQuery.data],
  )
  const listNoOptions = useMemo(
    () => (listNumbersQuery.data ?? []).map((listNo) => ({ value: listNo, label: listNo })),
    [listNumbersQuery.data],
  )

  const queryParams = toListInvoicesParams(debouncedFilters)

  const invoicesQuery = useQuery({
    queryKey: ['invoices', 'report', queryParams, sorting, pageIndex],
    queryFn: () =>
      listInvoices({
        ...queryParams,
        sort: toSortParam(sorting),
        page: pageIndex,
        size: PAGE_SIZE,
      }),
    placeholderData: (previous) => previous,
  })

  const [financeReportParams, setFinanceReportParams] = useState<Omit<
    ListInvoicesParams,
    'page' | 'size'
  > | null>(null)

  const financeReportQuery = useQuery({
    queryKey: ['invoices', 'finance-report', financeReportParams],
    queryFn: () => listInvoices({ ...financeReportParams!, size: 500 }),
    enabled: financeReportParams !== null,
  })

  function updateFilters(next: ReportFiltersValue) {
    setFilters(next)
    setPageIndex(0)
  }

  async function fetchAllFilteredRows() {
    const page = await listInvoices({
      ...toListInvoicesParams(filters),
      sort: toSortParam(sorting),
      page: 0,
      size: 5000,
    })
    return page.content.map(toReportRow)
  }

  async function handleExport(kind: 'copy' | 'csv' | 'excel' | 'print') {
    setIsExporting(true)
    try {
      const rows = await fetchAllFilteredRows()
      if (rows.length === 0) {
        toast.error('No rows match the current filters.')
        return
      }
      if (kind === 'copy') {
        await copyRowsToClipboard(rows)
        toast.success(`Copied ${rows.length} rows to clipboard`)
      } else if (kind === 'csv') {
        exportRowsToCsv(rows)
      } else if (kind === 'excel') {
        exportRowsToExcel(rows)
      } else {
        printRows(rows)
      }
    } catch {
      toast.error('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoice Report"
        description="Every invoice, with filters and export tools for finance reconciliation."
      />

      <div className="space-y-4">
        <ReportFilters
          value={filters}
          onChange={updateFilters}
          projectOptions={projectOptions}
          supplierOptions={supplierOptions}
          listNoOptions={listNoOptions}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExporting}
            onClick={() => handleExport('copy')}
          >
            <Clipboard className="size-4" /> Copy
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExporting}
            onClick={() => handleExport('csv')}
          >
            <FileText className="size-4" /> CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExporting}
            onClick={() => handleExport('excel')}
          >
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExporting}
            onClick={() => handleExport('print')}
          >
            <Printer className="size-4" /> Print
          </Button>

          <Button
            type="button"
            size="sm"
            className="ml-auto"
            disabled={!filters.listNo}
            onClick={() => {
              setFinanceReportListNo(filters.listNo)
              setFinanceReportParams(toListInvoicesParams(filters))
            }}
          >
            Generate Finance Report
          </Button>
        </div>

        <DataTable
          columns={invoiceReportColumns}
          data={invoicesQuery.data?.content ?? []}
          rowCount={invoicesQuery.data?.totalElements ?? 0}
          pageIndex={pageIndex}
          pageSize={PAGE_SIZE}
          onPageChange={setPageIndex}
          sorting={sorting}
          onSortingChange={(value) => {
            setSorting(value)
            setPageIndex(0)
          }}
          getRowId={(row) => String(row.id)}
          isLoading={invoicesQuery.isLoading}
          isError={invoicesQuery.isError}
          emptyMessage="No invoices match these filters."
        />
      </div>

      <FinanceReportModal
        listNo={financeReportListNo}
        invoices={financeReportQuery.data?.content ?? []}
        onOpenChange={(open) => {
          if (!open) {
            setFinanceReportListNo(null)
            setFinanceReportParams(null)
          }
        }}
      />
    </div>
  )
}
