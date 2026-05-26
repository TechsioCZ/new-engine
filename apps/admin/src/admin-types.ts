export type ActionRequiredSummary = {
  orders: ActionRequiredOrdersResponse
  customers: PendingB2BCustomersResponse
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

export type OrderBusinessStatusId =
  | "new"
  | "awaiting_payment"
  | "paid"
  | "processing"
  | "waiting_for_supplier"
  | "shipped"
  | "delivered"
  | "canceled"

export type ManualOrderBusinessStatusId =
  | "processing"
  | "waiting_for_supplier"
  | "canceled"

export type OrderBusinessStatusTone =
  | "blue"
  | "green"
  | "grey"
  | "orange"
  | "red"
  | "purple"

export type OrderBusinessStatus = {
  id: OrderBusinessStatusId
  priority: number
  tone: OrderBusinessStatusTone
  translation_key: `statuses.${OrderBusinessStatusId}`
}

export type OrderBusinessStatusSummary = {
  business_status: OrderBusinessStatus
  created_at?: string | null
  currency_code?: string | null
  custom_display_id?: string | null
  display_id?: number | null
  email?: string | null
  id: string
  manual_status?: ManualOrderBusinessStatusId | null
  total?: number | string | null
}

export type OrderExpeditionCarrierKey = "ppl" | "packeta" | "other"

export type OrderExpeditionTargetStatus =
  | "pending"
  | "completed"
  | "draft"
  | "archived"
  | "canceled"
  | "requires_action"

export type OrderExpeditionCarrierOption = {
  label: string
  value: OrderExpeditionCarrierKey
}

export type OrderExpeditionItem = {
  id?: string | null
  quantity: number
  sku?: string | null
  title: string
  variant?: string | null
}

export type OrderExpeditionOrder = {
  business_status: OrderBusinessStatus
  carrier: OrderExpeditionCarrierOption & {
    shipping_method_id?: string
    shipping_method_name?: string
    shipping_option_id?: string
  }
  created_at?: string | null
  currency_code?: string | null
  customer: string
  delivery_address: string[]
  display_id?: number | null
  email?: string | null
  has_active_fulfillment: boolean
  id: string
  items: OrderExpeditionItem[]
  manual_status?: ManualOrderBusinessStatusId | null
  order_display_id: string
  payment_method: string
  payment_status?: string | null
  status?: string | null
  total?: number | string | null
}

export type OrderExpeditionBlockingOrder = {
  id: string
  order_display_id: string
  reason: string
}

export type OrderExpeditionOrdersResponse = {
  business_status: OrderBusinessStatusId | null
  carrier: OrderExpeditionCarrierKey | null
  carrier_filter_limit_reached: boolean
  count: number
  count_exact: boolean
  has_next: boolean
  limit: number
  offset: number
  orders: OrderExpeditionOrder[]
  scanned_count: number | null
}

export type OrderExpeditionCarriersResponse = {
  carriers: OrderExpeditionCarrierOption[]
}

export type OrderBusinessStatusesByIdsResponse = {
  orders: OrderBusinessStatusSummary[]
}

export type BulkBusinessStatusResponse = {
  count: number
  orders: OrderBusinessStatusSummary[]
  skipped: OrderExpeditionBlockingOrder[]
  skipped_count: number
  status: ManualOrderBusinessStatusId | null
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

export type AdminStoreSummary = {
  default_location_id?: string | null
  default_region_id?: string | null
  default_sales_channel_id?: string | null
  id: string
  metadata?: Record<string, unknown> | null
  name: string
  supported_currencies?: AdminStoreCurrency[] | null
  supported_locales?: AdminStoreLocale[] | null
}

export type AdminStoreCurrency = {
  currency?: {
    code?: string | null
    name?: string | null
    symbol?: string | null
  } | null
  currency_code: string
  is_default?: boolean | null
}

export type AdminStoreLocale = {
  locale?: {
    code?: string | null
    name?: string | null
  } | null
  locale_code: string
}

export type AdminPricePreference = {
  attribute?: string | null
  id: string
  is_tax_inclusive?: boolean | null
  value?: string | null
}

export type AdminPricePreferencesResponse = {
  count: number
  limit: number
  offset: number
  price_preferences: AdminPricePreference[]
}

export type MedusaAdminStoresResponse = {
  count: number
  limit: number
  offset: number
  stores: AdminStoreSummary[]
}

export type AdminNamedReference = {
  id: string
  name: string
}

export type AdminNamedReferenceResponse<TKey extends string> = {
  [key in TKey]: AdminNamedReference
}

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

export type OrderEmailTemplate = {
  label: string
  subject: string | undefined
  template: string
  trigger_type: string
}

export type OrderEmailTemplatesResponse = {
  templates: OrderEmailTemplate[]
}

export type SendOrderEmailResponse = {
  order: {
    id: string
    email: string | null
    payment_status: string | null
    status: string | null
    total_formatted?: string
  }
  sent: boolean
  template: OrderEmailTemplate
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
  amount?: number | string | null
  currency_code?: string | null
  id?: string
  payments?: MedusaAdminPayment[] | null
  status?: string | null
}

export type MedusaAdminPayment = {
  amount?: number | string | null
  canceled_at?: string | null
  captured_at?: string | null
  created_at?: string | null
  currency_code?: string | null
  id?: string
  provider_id?: string | null
  refunds?: MedusaAdminRefund[] | null
}

export type MedusaAdminRefund = {
  amount?: number | string | null
  created_at?: string | null
  currency_code?: string | null
  id?: string
  payment_id?: string | null
}

export type MedusaAdminShippingMethod = {
  amount?: number | string | null
  id?: string
  name?: string | null
  provider_id?: string | null
  subtotal?: number | string | null
  tax_total?: number | string | null
  total?: number | string | null
}

export type MedusaAdminFulfillmentItem = {
  id?: string
  line_item_id?: string | null
  quantity?: number | string | null
  title?: string | null
}

export type MedusaAdminFulfillmentLabel = {
  id?: string
  label_url?: string | null
  tracking_number?: string | null
  tracking_url?: string | null
}

export type MedusaAdminFulfillment = {
  canceled_at?: string | null
  created_at?: string | null
  data?: Record<string, unknown> | null
  delivered_at?: string | null
  id?: string
  items?: MedusaAdminFulfillmentItem[] | null
  labels?: MedusaAdminFulfillmentLabel[] | null
  provider_id?: string | null
  requires_shipping?: boolean | null
  shipped_at?: string | null
}

export type MedusaAdminAddress = {
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  company?: string | null
  country_code?: string | null
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  postal_code?: string | null
  province?: string | null
}

export type MedusaAdminOrderItemVariant = {
  id?: string
  sku?: string | null
  title?: string | null
}

export type MedusaAdminOrderItemProduct = {
  handle?: string | null
  id?: string
  status?: string | null
  thumbnail?: string | null
  title?: string | null
}

export type MedusaAdminOrderItem = {
  id: string
  product?: MedusaAdminOrderItemProduct | null
  product_id?: string | null
  product_title?: string | null
  quantity?: number | string | null
  thumbnail?: string | null
  title?: string | null
  total?: number | string | null
  unit_price?: number | string | null
  variant?: MedusaAdminOrderItemVariant | null
  variant_sku?: string | null
  variant_title?: string | null
}

export type MedusaAdminOrder = {
  billing_address?: MedusaAdminAddress | null
  canceled_at?: string | null
  created_at?: string | null
  currency_code?: string | null
  customer?: MedusaAdminCustomer | null
  customer_id?: string | null
  custom_display_id?: string | null
  discount_total?: number | string | null
  display_id?: number | null
  email?: string | null
  fulfillment_status?: string | null
  fulfillments?: MedusaAdminFulfillment[] | null
  id: string
  item_subtotal?: number | string | null
  item_total?: number | string | null
  items?: MedusaAdminOrderItem[] | null
  metadata?: Record<string, unknown> | null
  original_total?: number | string | null
  payment_collections?: MedusaAdminPaymentCollection[] | null
  payment_status?: string | null
  refundable_total?: number | string | null
  sales_channel?: MedusaAdminSalesChannel | null
  shipping_address?: MedusaAdminAddress | null
  shipping_methods?: MedusaAdminShippingMethod[] | null
  shipping_subtotal?: number | string | null
  shipping_total?: number | string | null
  status?: string | null
  subtotal?: number | string | null
  tax_total?: number | string | null
  total?: number | string | null
}

export type MedusaAdminOrderResponse = {
  order: MedusaAdminOrder
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

export type MedusaAdminSalesChannel = {
  id?: string
  name?: string | null
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
  id?: string
  title?: string | null
}

export type MedusaAdminProductSalesChannel = {
  id: string
  name?: string | null
}

export type MedusaAdminProductVariant = {
  allow_backorder?: boolean | null
  barcode?: string | null
  ean?: string | null
  id: string
  manage_inventory?: boolean | null
  sku?: string | null
  title?: string | null
  upc?: string | null
  variant_rank?: number | null
}

export type MedusaAdminProductImage = {
  id?: string
  url?: string | null
}

export type MedusaAdminProductOption = {
  id?: string
  title?: string | null
  values?: { id?: string; value?: string | null }[] | null
}

export type MedusaAdminProductCategory = {
  id?: string
  name?: string | null
}

export type MedusaAdminProduct = {
  categories?: MedusaAdminProductCategory[] | null
  collection?: MedusaAdminProductCollection | null
  description?: string | null
  handle?: string | null
  id: string
  images?: MedusaAdminProductImage[] | null
  metadata?: Record<string, unknown> | null
  options?: MedusaAdminProductOption[] | null
  sales_channels?: MedusaAdminProductSalesChannel[] | null
  status?: string | null
  subtitle?: string | null
  thumbnail?: string | null
  title?: string | null
  variants?: MedusaAdminProductVariant[] | null
}

export type MedusaAdminProductResponse = {
  product: MedusaAdminProduct
}

export type MedusaAdminProductsResponse = {
  count: number
  limit: number
  offset: number
  products: MedusaAdminProduct[]
}
