import type {
  ExistingOrder,
  ExistingOrderIndex,
  UploadedInvoice,
} from "./client"
import type { InvoiceInput } from "./types"

type Metadata = Record<string, unknown>
const metadataValue = (
  metadata: Metadata | null | undefined,
  key: string,
): unknown => metadata?.[key]

const UNSAFE_FILENAME_CHARS = /[^a-zA-Z0-9._-]+/gu

interface InvoiceUploadPayload {
  access: "public"
  content: string
  filename: string
  mimeType: string
}

export interface InvoiceOrderLookupKeys {
  orderIds: Set<string>
  displayIds: Set<number>
  erpIds: Set<string>
}

export const invoicesBatchClientMapperHelper = {
  buildInvoiceUrl(invoice: InvoiceInput, uploaded?: UploadedInvoice | null) {
    return invoice.url ?? uploaded?.url
  },

  buildOrderIndex(orders: ExistingOrder[]): ExistingOrderIndex {
    const index: ExistingOrderIndex = {
      byDisplayId: new Map(),
      byErpId: new Map(),
      byId: new Map(),
    }

    for (const order of orders) {
      index.byId.set(order.id, order)
      index.byDisplayId.set(String(order.display_id), order)
      const erpId = this.stringMetadataValue(order.metadata, "erp_id")
      if (erpId !== null) {
        index.byErpId.set(erpId, order)
      }
    }

    return index
  },

  buildUpdatedMetadata(
    existingMetadata: Metadata | null | undefined,
    invoice: InvoiceInput,
    invoiceUrl: string,
    uploaded?: UploadedInvoice | null,
  ) {
    const current = this.getExistingInvoices(existingMetadata)
    const nextInvoice = {
      file_id: uploaded?.id,
      invoice_date: invoice.invoice_date,
      invoice_number: invoice.invoice_number,
      uploaded_at: new Date().toISOString(),
      url: invoiceUrl,
    }
    const filtered = current.filter(
      (item) => item.invoice_number !== invoice.invoice_number,
    )
    return {
      ...existingMetadata,
      invoice_date: invoice.invoice_date,
      invoice_number: invoice.invoice_number,
      invoice_url: invoiceUrl,
      invoices: [...filtered, nextInvoice],
    }
  },

  buildUploadPayload(invoice: InvoiceInput): InvoiceUploadPayload {
    return {
      access: "public",
      content: invoice.data ?? "",
      filename: `${this.sanitizeFilename(invoice.invoice_number)}.pdf`,
      mimeType: "application/pdf",
    }
  },

  collectOrderLookupKeys(invoices: InvoiceInput[]): InvoiceOrderLookupKeys {
    const orderIds = new Set<string>()
    const displayIds = new Set<number>()
    const erpIds = new Set<string>()

    for (const invoice of invoices) {
      if (
        invoice.identifier_type === "order_id" &&
        invoice.order_id !== undefined
      ) {
        orderIds.add(invoice.order_id)
      }
      if (
        invoice.identifier_type === "display_id" &&
        invoice.display_id !== undefined
      ) {
        const displayId = Number(invoice.display_id)
        if (Number.isInteger(displayId)) {
          displayIds.add(displayId)
        }
      }
      if (
        invoice.identifier_type === "erp_id" &&
        invoice.erp_id !== undefined
      ) {
        erpIds.add(invoice.erp_id)
      }
    }

    return { displayIds, erpIds, orderIds }
  },

  findExistingOrder(
    invoice: InvoiceInput,
    index: ExistingOrderIndex,
  ): ExistingOrder | null {
    if (
      invoice.identifier_type === "order_id" &&
      invoice.order_id !== undefined
    ) {
      return index.byId.get(invoice.order_id) ?? null
    }
    if (
      invoice.identifier_type === "display_id" &&
      invoice.display_id !== undefined
    ) {
      return index.byDisplayId.get(invoice.display_id) ?? null
    }
    if (invoice.identifier_type === "erp_id" && invoice.erp_id !== undefined) {
      return index.byErpId.get(invoice.erp_id) ?? null
    }
    return null
  },

  getExistingInvoices(metadata: Metadata | null | undefined) {
    const invoices = metadataValue(metadata, "invoices")
    if (!Array.isArray(invoices)) {
      return []
    }
    const candidates: unknown[] = invoices
    return candidates.filter(
      (invoice): invoice is { invoice_number: string } =>
        typeof invoice === "object" &&
        invoice !== null &&
        "invoice_number" in invoice &&
        typeof invoice.invoice_number === "string",
    )
  },

  getOrderIdentifier(invoice: InvoiceInput) {
    if (invoice.identifier_type === "display_id") {
      return invoice.display_id ?? ""
    }
    if (invoice.identifier_type === "order_id") {
      return invoice.order_id ?? ""
    }
    return invoice.erp_id ?? ""
  },

  sanitizeFilename(value: string) {
    return value.replace(UNSAFE_FILENAME_CHARS, "_")
  },

  stringMetadataValue(metadata: Metadata | null | undefined, key: string) {
    const value = metadata?.[key]
    return typeof value === "string" && value.length > 0 ? value : null
  },
}
