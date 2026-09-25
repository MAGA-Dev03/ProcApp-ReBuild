import { useNavigate } from 'react-router-dom'
import type { FinanceBatchSummary } from '@/api/client'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface RecentFinanceBatchesProps {
  data: FinanceBatchSummary[]
}

/** Jumps to the Invoice Report screen with this batch's List No already selected in the filter,
 * so a manager can go from "here's a recent batch" straight to the full printable report for it. */
export function RecentFinanceBatches({ data }: RecentFinanceBatchesProps) {
  const navigate = useNavigate()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>List No</TableHead>
          <TableHead>Batch Date</TableHead>
          <TableHead className="text-right">Invoices</TableHead>
          <TableHead className="text-right">Total Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((batch) => (
          <TableRow
            key={batch.listNo}
            className="cursor-pointer"
            onClick={() => navigate('/invoices/report', { state: { listNo: batch.listNo } })}
          >
            <TableCell className="font-medium">{batch.listNo}</TableCell>
            <TableCell>{batch.financeSubmitDate}</TableCell>
            <TableCell className="text-right tabular-nums">{batch.invoiceCount}</TableCell>
            <TableCell className="text-right">
              <CurrencyDisplay value={batch.totalValue} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
