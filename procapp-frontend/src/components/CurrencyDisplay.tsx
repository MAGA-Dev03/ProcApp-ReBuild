import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface CurrencyDisplayProps {
  value: number
  currency?: string
  className?: string
}

export function CurrencyDisplay({ value, currency = 'LKR', className }: CurrencyDisplayProps) {
  return <span className={cn('tabular-nums', className)}>{formatCurrency(value, currency)}</span>
}
