export type InvoiceIdentifierType = "display_id" | "order_id" | "erp_id"

export type InvoiceInput = {
  identifier_type: InvoiceIdentifierType
  display_id?: string | undefined
  order_id?: string | undefined
  erp_id?: string | undefined
  invoice_number: string
  invoice_date?: string | undefined
  url?: string | undefined
  data?: string | undefined
}

export type AttachInvoicesBatchInput = {
  user_id?: string | undefined
  invoices: InvoiceInput[]
}

export type AttachInvoicesBatchResult = {
  order_identifier: string
  status: "success" | "failed" | "not_found"
  order_id?: string
  invoice_number: string
  invoice_url?: string
  error?: string
}

export type AttachInvoicesBatchOutput = {
  success: boolean
  processed: number
  failed: number
  results: AttachInvoicesBatchResult[]
}
