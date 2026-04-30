import type { InvoiceInput } from "../types"
import type {
  ExistingOrder,
  ExistingOrderIndex,
  UploadedInvoice,
} from "./client"

type Metadata = Record<string, unknown>
const UNSAFE_FILENAME_CHARS = /[^a-zA-Z0-9._-]+/g

export type InvoiceOrderLookupKeys = {
  orderIds: Set<string>
  displayIds: Set<number>
  erpIds: Set<string>
}

export class InvoicesBatchClientMapperHelper {
  collectOrderLookupKeys(invoices: InvoiceInput[]): InvoiceOrderLookupKeys {
    const orderIds = new Set<string>()
    const displayIds = new Set<number>()
    const erpIds = new Set<string>()

    for (const invoice of invoices) {
      if (invoice.identifier_type === "order_id" && invoice.order_id) {
        orderIds.add(invoice.order_id)
      }
      if (invoice.identifier_type === "display_id" && invoice.display_id) {
        const displayId = Number(invoice.display_id)
        if (Number.isInteger(displayId)) {
          displayIds.add(displayId)
        }
      }
      if (invoice.identifier_type === "erp_id" && invoice.erp_id) {
        erpIds.add(invoice.erp_id)
      }
    }

    return { orderIds, displayIds, erpIds }
  }

  buildOrderIndex(orders: ExistingOrder[]): ExistingOrderIndex {
    const index: ExistingOrderIndex = {
      byId: new Map(),
      byDisplayId: new Map(),
      byErpId: new Map(),
    }

    for (const order of orders) {
      index.byId.set(order.id, order)
      index.byDisplayId.set(String(order.display_id), order)
      const erpId = this.stringMetadataValue(order.metadata, "erp_id")
      if (erpId) {
        index.byErpId.set(erpId, order)
      }
    }

    return index
  }

  findExistingOrder(
    invoice: InvoiceInput,
    index: ExistingOrderIndex
  ): ExistingOrder | null {
    if (invoice.identifier_type === "order_id" && invoice.order_id) {
      return index.byId.get(invoice.order_id) ?? null
    }
    if (invoice.identifier_type === "display_id" && invoice.display_id) {
      return index.byDisplayId.get(invoice.display_id) ?? null
    }
    if (invoice.identifier_type === "erp_id" && invoice.erp_id) {
      return index.byErpId.get(invoice.erp_id) ?? null
    }
    return null
  }

  getOrderIdentifier(invoice: InvoiceInput) {
    if (invoice.identifier_type === "display_id") {
      return invoice.display_id ?? ""
    }
    if (invoice.identifier_type === "order_id") {
      return invoice.order_id ?? ""
    }
    return invoice.erp_id ?? ""
  }

  buildUploadPayload(invoice: InvoiceInput) {
    return {
      filename: `${this.sanitizeFilename(invoice.invoice_number)}.pdf`,
      mimeType: "application/pdf",
      content: invoice.data ?? "",
      access: "public",
    }
  }

  buildInvoiceUrl(invoice: InvoiceInput, uploaded?: UploadedInvoice | null) {
    return invoice.url ?? uploaded?.url
  }

  buildUpdatedMetadata(
    existingMetadata: Metadata | null | undefined,
    invoice: InvoiceInput,
    invoiceUrl: string,
    uploaded?: UploadedInvoice | null
  ) {
    const current = this.getExistingInvoices(existingMetadata)
    const nextInvoice = {
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      url: invoiceUrl,
      file_id: uploaded?.id,
      uploaded_at: new Date().toISOString(),
    }
    const filtered = current.filter(
      (item) => item.invoice_number !== invoice.invoice_number
    )
    return {
      ...(existingMetadata ?? {}),
      invoices: [...filtered, nextInvoice],
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      invoice_url: invoiceUrl,
    }
  }

  private getExistingInvoices(metadata: Metadata | null | undefined) {
    const invoices = metadata?.invoices
    if (!Array.isArray(invoices)) {
      return []
    }
    return invoices.filter(
      (invoice): invoice is { invoice_number: string } =>
        typeof invoice === "object" &&
        invoice !== null &&
        "invoice_number" in invoice &&
        typeof invoice.invoice_number === "string"
    )
  }

  private sanitizeFilename(value: string) {
    return value.replace(UNSAFE_FILENAME_CHARS, "_")
  }

  private stringMetadataValue(
    metadata: Metadata | null | undefined,
    key: string
  ) {
    const value = metadata?.[key]
    return typeof value === "string" && value.length ? value : null
  }
}

export const invoicesBatchClientMapperHelper =
  new InvoicesBatchClientMapperHelper()
