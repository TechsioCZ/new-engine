import { isRecord } from "@techsio/std/object"

const resolveRecordValue = (
  source: Record<string, unknown>,
  key: string,
): string | null => {
  const value = source[key]
  if (typeof value !== "string") {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const resolveOrderInvoiceUrl = (
  order: { metadata?: unknown } | null | undefined,
) => {
  const metadata = isRecord(order?.metadata) ? order.metadata : {}
  return (
    resolveRecordValue(metadata, "invoice_url") ??
    resolveRecordValue(metadata, "invoiceUrl") ??
    resolveRecordValue(metadata, "invoice_href") ??
    resolveRecordValue(metadata, "invoiceHref")
  )
}
