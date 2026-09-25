import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { InvoiceFormFields, type InvoiceFormFieldsProps } from './InvoiceFormFields'

/** Card + Collapsible shell used for the inline Add/Edit form on /invoices. Keyed by invoice id
 * at the call site so switching invoices (or entering/leaving edit mode) remounts fresh instead
 * of syncing via an effect. */
function InvoiceFormCardInner(props: InvoiceFormFieldsProps) {
  const [isOpen, setIsOpen] = useState(props.mode === 'edit')

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between text-left">
              <CardTitle>{props.mode === 'edit' ? 'Edit Invoice' : 'Add Invoice'}</CardTitle>
              <ChevronDown
                className={cn('size-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
              />
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <InvoiceFormFields {...props} />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export function InvoiceFormCard(props: InvoiceFormFieldsProps) {
  return <InvoiceFormCardInner key={props.invoice?.id ?? 'create'} {...props} />
}
