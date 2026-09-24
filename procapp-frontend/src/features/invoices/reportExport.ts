import * as XLSX from 'xlsx'
import type { InvoiceWithRelations } from '@/types'

export interface ReportRow {
  'Invoice Type': string
  'Invoice Source': string
  Project: string
  Supplier: string
  'Invoice No': string
  'Invoice Date': string
  'Received Date': string
  'PO Number': string
  Value: number
  'PIO No': string
  'GRN No': string
  'GRN Received Date': string
  'List No': string
  'Finance Submit Date': string
  Remarks: string
  Attachment: string
  Status: string
  Author: string
  'Updated By': string
  'Created At': string
  'Updated At': string
}

const INVOICE_TYPE_LABEL: Record<string, string> = {
  CREDIT: 'Credit',
  ADVANCE: 'Advance',
  LC: 'Letter of Credit',
}
const INVOICE_SOURCE_LABEL: Record<string, string> = {
  DIRECT: 'Direct',
  STORES: 'Stores',
  PROJECT: 'Project',
}

export function toReportRow(invoice: InvoiceWithRelations): ReportRow {
  return {
    'Invoice Type': INVOICE_TYPE_LABEL[invoice.invoiceType] ?? invoice.invoiceType,
    'Invoice Source': INVOICE_SOURCE_LABEL[invoice.invoiceSource] ?? invoice.invoiceSource,
    Project: `${invoice.project.name} (${invoice.project.code})`,
    Supplier: invoice.supplier.name,
    'Invoice No': invoice.invoiceNumber,
    'Invoice Date': invoice.invoiceDate,
    'Received Date': invoice.receivedDate,
    'PO Number': invoice.purchaseOrderNumber,
    Value: invoice.value,
    'PIO No': invoice.pioNumber,
    'GRN No': invoice.grnNumber ?? '',
    'GRN Received Date': invoice.grnReceivedDate ?? '',
    'List No': invoice.listNo ?? '',
    'Finance Submit Date': invoice.financeSubmitDate ?? '',
    Remarks: invoice.remarks ?? '',
    Attachment: invoice.attachmentUrl ? 'Yes' : '',
    Status: invoice.active ? 'Active' : 'Cancelled',
    Author: invoice.author.name,
    'Updated By': invoice.updatedBy?.name ?? '',
    'Created At': invoice.createdAt,
    'Updated At': invoice.updatedAt,
  }
}

/** Leading characters that make Excel/Sheets/LibreOffice evaluate a cell as a formula (tab/CR
 * included because some importers strip them and then evaluate what follows). */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/

/** Report cells carry untrusted free text (invoice/PO/PIO/GRN numbers, remarks, names). A leading
 * apostrophe makes spreadsheets show it as literal text instead of running it (F-17). Non-strings
 * pass through so the Value column stays numeric. */
export function neutralizeSpreadsheetCell(value: unknown): unknown {
  if (typeof value !== 'string' || !FORMULA_TRIGGER.test(value)) return value
  return `'${value}`
}

function neutralizeRow(row: ReportRow): Record<keyof ReportRow, unknown> {
  const safe = {} as Record<keyof ReportRow, unknown>
  for (const key of Object.keys(row) as (keyof ReportRow)[]) {
    safe[key] = neutralizeSpreadsheetCell(row[key])
  }
  return safe
}

function toCsvValue(value: unknown): string {
  const str = String(neutralizeSpreadsheetCell(value ?? ''))
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function rowsToCsv(rows: ReportRow[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0]) as (keyof ReportRow)[]
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((header) => toCsvValue(row[header])).join(','))
  }
  return lines.join('\n')
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportRowsToCsv(rows: ReportRow[], filename = 'invoice-report.csv') {
  downloadBlob(rowsToCsv(rows), filename, 'text/csv;charset=utf-8;')
}

export function exportRowsToExcel(rows: ReportRow[], filename = 'invoice-report.xlsx') {
  const worksheet = XLSX.utils.json_to_sheet(rows.map(neutralizeRow))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices')
  XLSX.writeFile(workbook, filename)
}

export async function copyRowsToClipboard(rows: ReportRow[]): Promise<void> {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0]) as (keyof ReportRow)[]
  const lines = [headers.join('\t')]
  for (const row of rows) {
    lines.push(
      headers
        // Pasting into a spreadsheet evaluates formulas too; tabs/newlines inside a value would
        // also split it into extra cells/rows.
        .map((header) =>
          String(neutralizeSpreadsheetCell(row[header] ?? '')).replace(/[\t\r\n]+/g, ' '),
        )
        .join('\t'),
    )
  }
  await navigator.clipboard.writeText(lines.join('\n'))
}

/** Labels/values are untrusted data (remarks, names) - escaped via textContent, never innerHTML
 * string concatenation. */
function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

export function printRows(rows: ReportRow[], title = 'Invoice Report') {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0]) as (keyof ReportRow)[]
  const printWindow = window.open('', '_blank', 'width=1200,height=800')
  if (!printWindow) return

  const tableRows = rows
    .map(
      (row) =>
        `<tr>${headers.map((header) => `<td>${escapeHtml(String(row[header] ?? ''))}</td>`).join('')}</tr>`,
    )
    .join('')

  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: system-ui, sans-serif; font-size: 11px; padding: 16px; }
          h1 { font-size: 16px; margin-bottom: 12px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; white-space: nowrap; }
          th { background: #f3f3f1; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
