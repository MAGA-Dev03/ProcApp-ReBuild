import { downloadInvoiceAttachment, downloadSiteKeeperAttachment } from '@/api/client'

/** Saves the blob to disk instead of rendering it inside the app: the backend now
 * sends attachments as `Content-Disposition: attachment`, so they can never execute
 * as a page (e.g. a disguised SVG/HTML) in the app's own origin. */
function saveBlobToDisk(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Fetches an invoice attachment (the endpoint needs the bearer token, so a
 * plain <a href> can't reach it) and downloads it. */
export async function openInvoiceAttachment(invoiceId: number): Promise<void> {
  const { blob, filename } = await downloadInvoiceAttachment(invoiceId)
  saveBlobToDisk(blob, filename ?? `invoice-${invoiceId}-attachment`)
}

/** Site-keeper variant, scoped to the keeper's assigned projects server-side. */
export async function openSiteKeeperAttachment(invoiceId: number): Promise<void> {
  const { blob, filename } = await downloadSiteKeeperAttachment(invoiceId)
  saveBlobToDisk(blob, filename ?? `invoice-${invoiceId}-attachment`)
}
