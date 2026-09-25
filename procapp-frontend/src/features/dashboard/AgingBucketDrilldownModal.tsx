import { useQuery } from '@tanstack/react-query'
import { getAgingBucketBreakdown, type AgingBreakdownRow, type AgingBucketKey } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/EmptyState'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'

interface AgingBucketDrilldownModalProps {
  bucket: AgingBucketKey | null
  onOpenChange: (open: boolean) => void
}

function BreakdownList({
  rows,
  isLoading,
  columnLabel,
}: {
  rows: AgingBreakdownRow[] | undefined
  isLoading: boolean
  columnLabel: string
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return <EmptyState title="Nothing in this bucket" description="No outstanding invoices here." />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{columnLabel}</TableHead>
          <TableHead className="text-right">Invoices</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="max-w-[200px] truncate">{row.name}</TableCell>
            <TableCell className="text-right tabular-nums">{row.invoiceCount}</TableCell>
            <TableCell className="text-right">
              <CurrencyDisplay value={row.totalValue} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function AgingBucketDrilldownModal({
  bucket,
  onOpenChange,
}: AgingBucketDrilldownModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'aging-breakdown', bucket],
    queryFn: () => getAgingBucketBreakdown(bucket!),
    enabled: bucket !== null,
  })

  return (
    <Dialog open={bucket !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{bucket} days outstanding</DialogTitle>
          <DialogDescription>
            Breakdown of outstanding invoice value in this aging bucket.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="supplier">
          <TabsList className="w-full">
            <TabsTrigger value="supplier" className="flex-1">
              By Supplier
            </TabsTrigger>
            <TabsTrigger value="project" className="flex-1">
              By Project
            </TabsTrigger>
          </TabsList>
          <TabsContent value="supplier">
            <BreakdownList rows={data?.bySupplier} isLoading={isLoading} columnLabel="Supplier" />
          </TabsContent>
          <TabsContent value="project">
            <BreakdownList rows={data?.byProject} isLoading={isLoading} columnLabel="Project" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
