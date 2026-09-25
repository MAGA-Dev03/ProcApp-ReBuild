import jsPDF from 'jspdf'
import autoTable, { type CellHookData, type RowInput } from 'jspdf-autotable'
import type { InvoiceWithRelations } from '@/types'
import { assetUrl } from '@/lib/utils'

const TITLE = 'Payment Submission / Procurement Department'
const FOOTER = 'Copyright © MAGA IT 2026. All rights reserved.'

const COLUMNS = [
  { header: 'No', width: 18 },
  { header: 'Invoice Date\n(M/ D/ Y)', width: 40 },
  { header: 'Supplier', width: 92 },
  { header: 'Site', width: 92 },
  { header: 'PO NO', width: 44 },
  { header: 'Officer', width: 30 },
  { header: 'Invoice No', width: 58 },
  { header: 'PIO Number', width: 42 },
  { header: 'Amount (RS)', width: 50 },
  { header: 'Returned Date & Reason', width: 54 },
  { header: 'Returned To', width: 34 },
]

/** Signature boxes along the bottom of the form, each spanning `colSpan` table columns. */
const SIGNATURES: { label: string; colSpan: number; signatory?: string[] }[] = [
  { label: 'Prepared By:', colSpan: 3 },
  { label: 'Checked By:', colSpan: 1 },
  { label: 'Certified By:', colSpan: 2 },
  { label: 'Approved By:', colSpan: 3, signatory: ['B K L Perera', 'Manager - Procurement'] },
  { label: 'Submission Accepted By:', colSpan: 2 },
]

const MARGIN = 20
const FONT_SIZE = 6.5
const SIGNATURE_ROW_HEIGHT = 70

// Logo's natural size is 120x78 (a ~1.54:1 lockup), scaled down to a letterhead-sized mark.
const LOGO_TOP = 15
const LOGO_WIDTH = 55
const LOGO_HEIGHT = LOGO_WIDTH * (78 / 120)

/** jsPDF's addImage needs the image data up front (base64/data URL), not a URL it can load
 * itself - so the logo is fetched and inlined once per report generation. */
async function loadLogoDataUrl(): Promise<string> {
  const response = await fetch(assetUrl('/logo.png'))
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read logo image'))
    reader.readAsDataURL(blob)
  })
}

/** "2026-06-17" (or a full ISO timestamp) -> "06/17/2026", without timezone shifting. */
function formatMdy(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-')
  return `${month}/${day}/${year}`
}

/** The list number is YYYY/MM/DD/NNN, so it carries the submission date as a fallback. */
function submissionDate(listNo: string, invoices: InvoiceWithRelations[]): string {
  const submitted = invoices.find((invoice) => invoice.financeSubmitDate)?.financeSubmitDate
  if (submitted) return formatMdy(submitted)
  const [year, month, day] = listNo.split('/')
  return `${month}/${day}/${year}`
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function drawDottedLine(doc: jsPDF, x1: number, x2: number, y: number) {
  doc.setLineDashPattern([0.6, 1.2], 0)
  doc.line(x1, y, x2, y)
  doc.setLineDashPattern([], 0)
}

/** Signature cells are left empty for autoTable and drawn by hand: dotted sign-here lines,
 * the label, an optional printed signatory, and a dotted "Date:" line at the bottom. */
function drawSignatureCell(doc: jsPDF, data: CellHookData) {
  const signature = (data.cell.raw as { signature?: (typeof SIGNATURES)[number] }).signature
  if (!signature) return
  const { x, y, width, height } = data.cell
  const left = x + 3
  const right = x + Math.min(width - 6, 115)

  doc.setFontSize(FONT_SIZE)
  doc.setTextColor(0)
  drawDottedLine(doc, left, right, y + 12)
  doc.text(signature.label, left, y + 24)
  if (signature.signatory) {
    signature.signatory.forEach((line, index) => doc.text(line, left, y + 33 + index * 9))
  } else {
    drawDottedLine(doc, left, right, y + 34)
    drawDottedLine(doc, left, right, y + 44)
  }
  doc.text('Date:', left, y + height - 5)
  drawDottedLine(doc, left + doc.getTextWidth('Date:') + 1, right, y + height - 5)
}

export async function downloadFinanceReportPdf(listNo: string, invoices: InvoiceWithRelations[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const total = invoices.reduce((sum, invoice) => sum + invoice.value, 0)

  doc.addImage(await loadLogoDataUrl(), 'PNG', MARGIN, LOGO_TOP, LOGO_WIDTH, LOGO_HEIGHT)

  const head: RowInput[] = [
    [{ content: TITLE, colSpan: COLUMNS.length, styles: { halign: 'center' } }],
    [
      'Date',
      submissionDate(listNo, invoices),
      { content: '', colSpan: 5 },
      'Doc. No:',
      { content: listNo, colSpan: 2 },
      '',
    ],
    COLUMNS.map((column) => column.header),
  ]

  const body: RowInput[] = invoices.map((invoice, index) => [
    String(index + 1),
    formatMdy(invoice.invoiceDate),
    invoice.supplier.name,
    invoice.project.name,
    invoice.purchaseOrderNumber,
    '',
    invoice.invoiceNumber,
    invoice.pioNumber,
    { content: formatAmount(invoice.value), styles: { halign: 'right' } },
    '',
    '',
  ])

  const foot: RowInput[] = [
    [
      { content: '', colSpan: 7 },
      'Total',
      { content: formatAmount(total), styles: { halign: 'right' } },
      { content: '', colSpan: 2 },
    ],
    SIGNATURES.map((signature) => ({
      content: '',
      colSpan: signature.colSpan,
      signature,
      styles: { minCellHeight: SIGNATURE_ROW_HEIGHT },
    })),
  ]

  autoTable(doc, {
    startY: LOGO_TOP + LOGO_HEIGHT + 8,
    // Bottom margin keeps table rows clear of the copyright footer on every page.
    margin: { left: MARGIN, right: MARGIN, bottom: 40 },
    theme: 'grid',
    head,
    body,
    foot,
    showFoot: 'lastPage',
    styles: {
      font: 'helvetica',
      fontSize: FONT_SIZE,
      fontStyle: 'normal',
      textColor: 0,
      fillColor: false,
      lineColor: 0,
      lineWidth: 0.5,
      cellPadding: 2,
      valign: 'middle',
    },
    headStyles: { fillColor: false, textColor: 0, fontStyle: 'normal' },
    footStyles: { fillColor: false, textColor: 0, fontStyle: 'normal' },
    columnStyles: Object.fromEntries(
      COLUMNS.map((column, index) => [index, { cellWidth: column.width }]),
    ),
    didDrawCell: (data) => {
      if (data.section === 'foot') drawSignatureCell(doc, data)
    },
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(FONT_SIZE)
  doc.setTextColor(0)
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page)
    doc.text(FOOTER, pageWidth / 2, pageHeight - 20, { align: 'center' })
  }

  doc.save(`finance-report-${listNo.replaceAll('/', '-')}.pdf`)
}
