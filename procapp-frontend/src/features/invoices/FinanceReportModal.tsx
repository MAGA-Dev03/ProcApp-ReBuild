import { useState } from 'react'
import { toast } from 'sonner'
import type { InvoiceWithRelations } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import { formatCurrency } from '@/lib/format'
import { assetUrl } from '@/lib/utils'
import { downloadFinanceReportPdf } from './financeReportPdf'
import { exportRowsToExcel, toReportRow } from './reportExport'

const SIGNATURE_LABELS = ['Prepared By', 'Checked By', 'Certified By', 'Approved By']

interface FinanceReportModalProps {
  listNo: string | null
  invoices: InvoiceWithRelations[]
  onOpenChange: (open: boolean) => void
}

export function FinanceReportModal({ listNo, invoices, onOpenChange }: FinanceReportModalProps) {
  const total = invoices.reduce((sum, invoice) => sum + invoice.value, 0)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  async function handleDownloadPdf() {
    if (!listNo) return
    setIsGeneratingPdf(true)
    try {
      await downloadFinanceReportPdf(listNo, invoices)
    } catch {
      toast.error('Could not generate the PDF. Please try again.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  function handleExportExcel() {
    if (!listNo) return
    try {
      exportRowsToExcel(
        invoices.map(toReportRow),
        `finance-report-${listNo.replaceAll('/', '-')}.xlsx`,
      )
    } catch {
      toast.error('Could not export to Excel. Please try again.')
    }
  }

  return (
    <Dialog open={listNo !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {listNo && (
          <>
            <DialogHeader className="flex-row items-center gap-3">
              <img src={assetUrl('/logo.png')} alt="MAGA Engineering" className="h-12 w-auto shrink-0" />
              <div>
                <DialogTitle>Payment Submission — Procurement Department</DialogTitle>
                <DialogDescription>
                  List No: {listNo} · Generated {new Date().toLocaleDateString()}
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left">
                    <th className="p-2 font-medium">Invoice No</th>
                    <th className="p-2 font-medium">Project</th>
                    <th className="p-2 font-medium">Supplier</th>
                    <th className="p-2 font-medium">PO Number</th>
                    <th className="p-2 text-right font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-border last:border-0">
                      <td className="p-2">{invoice.invoiceNumber}</td>
                      <td className="p-2">
                        {invoice.project.name}{' '}
                        <span className="text-muted-foreground">({invoice.project.code})</span>
                      </td>
                      <td className="p-2">{invoice.supplier.name}</td>
                      <td className="p-2">{invoice.purchaseOrderNumber}</td>
                      <td className="p-2 text-right">
                        <CurrencyDisplay value={invoice.value} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border font-medium">
                    <td className="p-2" colSpan={4}>
                      Total ({invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'})
                    </td>
                    <td className="p-2 text-right">
                      <CurrencyDisplay value={total} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-8 pt-6 sm:grid-cols-4">
              {SIGNATURE_LABELS.map((label) => (
                <div key={label} className="space-y-1">
                  <div className="h-8 border-b border-foreground/40" />
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
                {isGeneratingPdf ? 'Generating…' : 'Download as PDF'}
              </Button>
              <Button type="button" variant="outline" onClick={handleExportExcel}>
                Export to Excel
              </Button>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {invoices.length} invoices totalling {formatCurrency(total)}.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
