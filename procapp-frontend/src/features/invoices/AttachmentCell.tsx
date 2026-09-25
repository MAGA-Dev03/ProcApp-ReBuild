import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { openInvoiceAttachment } from './attachmentDownload'

/** Read-only table cell for the Attachment column: a button that downloads the
 * file with the auth header and opens it. Renders nothing here when the invoice
 * has no attachment — callers handle the empty dash. */
export function AttachmentCell({ invoiceId }: { invoiceId: number }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await openInvoiceAttachment(invoiceId)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not open the attachment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
      aria-label="Download attachment"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
    </button>
  )
}
