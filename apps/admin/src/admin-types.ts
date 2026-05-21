export type ActionRequiredSummary = {
  orders: {
    count: number
  }
  customers: {
    count: number
  }
}

export type ActionRequiredOrder = {
  created_at: string | null
  currency_code: string | null
  custom_display_id: string | null
  display_id: number | null
  email: string | null
  id: string
  manual_status: string | null
  payment_status: string | null
  status: string | null
  total: number | string | null
}

export type PendingB2BCustomer = {
  company_name: string | null
  created_at: string | null
  email: string | null
  first_name: string | null
  id: string
  last_name: string | null
  metadata: Record<string, unknown>
  phone: string | null
}

export type ActionRequiredOrdersResponse = {
  count: number
  count_exact: boolean
  has_next: boolean
  limit: number
  offset: number
  orders: ActionRequiredOrder[]
}

export type PendingB2BCustomersResponse = {
  count: number
  count_exact: boolean
  customers: PendingB2BCustomer[]
  has_next: boolean
  limit: number
  offset: number
}

export type BadgeKey = "ordersActionRequired" | "customersActionRequired"

export type AdminProductListItem = {
  collection_title: string | null
  handle: string | null
  id: string
  sales_channel_count: number
  status: string | null
  thumbnail: string | null
  title: string
  variant_count: number
}

export type AdminProductsResponse = {
  count: number
  has_next: boolean
  has_previous: boolean
  limit: number
  offset: number
  products: AdminProductListItem[]
}

export type AdminEmailLog = {
  checked_at: string | null
  created_at: string | null
  customer_id: string | null
  email_id: string
  id: string
  order_id: string | null
  sent_at: string | null
  sent_to: string
  subject: string
  type: string
  updated_at: string | null
}

export type AdminEmailLogsResponse = {
  count: number
  email_logs: AdminEmailLog[]
  has_next: boolean
  has_previous: boolean
  limit: number
  offset: number
}

export type ResendEmail = {
  created_at?: string
  from?: string
  html?: string
  id?: string
  last_event?: string
  subject?: string
  text?: string
  to?: string | string[]
  [key: string]: unknown
}

export type AdminEmailLogDetailResponse = {
  email_log: AdminEmailLog
  resend_email: ResendEmail | null
}

export type MedusaAdminEmailLogsResponse = {
  count: number
  email_logs: AdminEmailLog[]
  limit: number
  offset: number
}

export type PacketaFulfillmentData = {
  barcode?: string
  packet_id?: number
}

export type PacketaOrderFulfillment = {
  canceled_at: string | null
  data: PacketaFulfillmentData | null
  id: string
  provider_id: string
}

export type PacketaLabelOrder = {
  created_at: string | null
  custom_display_id: string | null
  display_id: number | null
  email: string | null
  fulfillment_status: string | null
  fulfillments: PacketaOrderFulfillment[]
  id: string
}

export type PacketaLabelOrdersResponse = {
  count: number
  has_next: boolean
  has_previous: boolean
  limit: number
  offset: number
  orders: PacketaLabelOrder[]
}

export type PacketaConfigResponse = {
  config: PacketaConfig
}

export type PacketaConfig = {
  api_password_set: boolean
  cod_bank_account_set: boolean
  cod_bank_code_set: boolean
  cod_iban_set: boolean
  cod_swift_set: boolean
  default_label_format: "A6" | "A7" | string
  default_label_offset: number
  environment: string
  eshop_id: string | null
  id: string
  is_enabled: boolean
  sender_city: string | null
  sender_country: string | null
  sender_email: string | null
  sender_label: string | null
  sender_name: string | null
  sender_phone: string | null
  sender_street: string | null
  sender_zip_code: string | null
}

export type PacketaConfigInput = {
  api_password?: string | null
  cod_bank_account?: string | null
  cod_bank_code?: string | null
  cod_iban?: string | null
  cod_swift?: string | null
  default_label_format?: "A6" | "A7"
  default_label_offset?: number
  eshop_id?: string
  is_enabled?: boolean
  sender_city?: string
  sender_country?: string
  sender_email?: string
  sender_label?: string
  sender_name?: string
  sender_phone?: string
  sender_street?: string
  sender_zip_code?: string
}

export type PplConfigResponse = {
  config: PplConfig
}

export type PplLabelFormat = "Jpeg" | "Pdf" | "Png" | "Svg" | "Zpl"

export type PplConfig = {
  client_id: string | null
  client_secret_set: boolean
  cod_bank_account_set: boolean
  cod_bank_code_set: boolean
  cod_iban_set: boolean
  cod_swift_set: boolean
  default_label_format: PplLabelFormat | string
  environment: string
  id: string
  is_enabled: boolean
  sender_city: string | null
  sender_country: string | null
  sender_email: string | null
  sender_name: string | null
  sender_phone: string | null
  sender_street: string | null
  sender_zip_code: string | null
}

export type PplConfigInput = {
  client_id?: string
  client_secret?: string | null
  cod_bank_account?: string | null
  cod_bank_code?: string | null
  cod_iban?: string | null
  cod_swift?: string | null
  default_label_format?: PplLabelFormat
  is_enabled?: boolean
  sender_city?: string
  sender_country?: string
  sender_email?: string
  sender_name?: string
  sender_phone?: string
  sender_street?: string
  sender_zip_code?: string
}

export type PayloadRuntimeConfigResponse = {
  iframeUrl: string | null
  isIframeEnabled: boolean
}

export type MedusaPacketaLabelOrdersResponse = {
  count: number
  limit: number
  offset: number
  orders: PacketaLabelOrder[]
}

export type QrPaymentConfig = {
  iban: string | null
  id: string
}

export type QrPaymentConfigResponse = {
  config: QrPaymentConfig
}

export type QrPaymentConfigInput = {
  iban?: string | null
}

export type MedusaAdminPaymentCollection = {
  status?: string | null
}

export type MedusaAdminFulfillment = {
  canceled_at?: string | null
  delivered_at?: string | null
  shipped_at?: string | null
}

export type MedusaAdminOrder = {
  created_at?: string | null
  currency_code?: string | null
  custom_display_id?: string | null
  display_id?: number | null
  email?: string | null
  fulfillment_status?: string | null
  fulfillments?: MedusaAdminFulfillment[] | null
  id: string
  metadata?: Record<string, unknown> | null
  payment_collections?: MedusaAdminPaymentCollection[] | null
  payment_status?: string | null
  status?: string | null
  total?: number | string | null
}

export type MedusaAdminCustomer = {
  company_name?: string | null
  created_at?: string | null
  email?: string | null
  first_name?: string | null
  id: string
  last_name?: string | null
  metadata?: Record<string, unknown> | null
  phone?: string | null
}

export type MedusaAdminOrdersResponse = {
  count: number
  limit: number
  offset: number
  orders: MedusaAdminOrder[]
}

export type MedusaAdminCustomersResponse = {
  count: number
  customers: MedusaAdminCustomer[]
  limit: number
  offset: number
}

export type MedusaAdminProductCollection = {
  title?: string | null
}

export type MedusaAdminProductSalesChannel = {
  id: string
}

export type MedusaAdminProductVariant = {
  id: string
}

export type MedusaAdminProduct = {
  collection?: MedusaAdminProductCollection | null
  handle?: string | null
  id: string
  sales_channels?: MedusaAdminProductSalesChannel[] | null
  status?: string | null
  thumbnail?: string | null
  title?: string | null
  variants?: MedusaAdminProductVariant[] | null
}

export type MedusaAdminProductsResponse = {
  count: number
  limit: number
  offset: number
  products: MedusaAdminProduct[]
}
