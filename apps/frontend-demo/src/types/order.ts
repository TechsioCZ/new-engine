interface OrderItem {
  id: string
  title: string
  subtitle: string | null
  thumbnail: string | null
  variant_id: string
  product_id: string
  product_title: string
  product_description: string
  product_subtitle: string | null
  product_type: string | null
  product_type_id: string | null
  product_collection: string | null
  product_handle: string
  variant_sku: string
  variant_barcode: string | null
  variant_title: string
  variant_option_values: string | null
  requires_shipping: boolean
  is_giftcard: boolean
  is_discountable: boolean
  is_tax_inclusive: boolean
  is_custom_price: boolean
  metadata: Record<string, unknown>
  unit_price: number
  quantity: number
  subtotal: number
  total: number
  original_total: number
  discount_total: number
  discount_subtotal: number
  discount_tax_total: number
  tax_total: number
  original_tax_total: number
  refundable_total_per_unit: number
  refundable_total: number
  fulfilled_total: number
  shipped_total: number
  return_requested_total: number
  return_received_total: number
  return_dismissed_total: number
  write_off_total: number
}

interface OrderSummary {
  paid_total: number
  refunded_total: number
  accounting_total: number
  credit_line_total: number
  transaction_total: number
  pending_difference: number
  current_order_total: number
  original_order_total: number
}

interface Address {
  id: string
  customer_id: string | null
  company: string | null
  first_name: string
  last_name: string
  address_1: string
  address_2: string | null
  city: string
  country_code: string
  province: string | null
  postal_code: string
  phone: string | null
  metadata: Record<string, unknown> | null
}

interface ShippingMethod {
  id: string
  name: string
  amount: number
  subtotal: number
  total: number
  tax_total: number
  data: Record<string, unknown>
  provider_id: string
}

interface PaymentCollection {
  id: string
  currency_code: string
  amount: number
  authorized_amount: number
  captured_amount: number
  refunded_amount: number
  status:
    | "not_paid"
    | "awaiting"
    | "authorized"
    | "partially_authorized"
    | "paid"
}

interface Fulfillment {
  id: string
  location_id: string
  packed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  canceled_at: string | null
  data: Record<string, unknown>
  provider_id: string
}

export type OrderStatus =
  | "pending"
  | "completed"
  | "archived"
  | "canceled"
  | "requires_action"
type PaymentStatus =
  | "not_paid"
  | "awaiting"
  | "authorized"
  | "partially_authorized"
  | "captured"
  | "partially_captured"
  | "partially_refunded"
  | "refunded"
  | "canceled"
type FulfillmentStatus =
  | "not_fulfilled"
  | "partially_fulfilled"
  | "fulfilled"
  | "partially_shipped"
  | "shipped"
  | "partially_returned"
  | "returned"
  | "canceled"

export interface Order {
  id: string
  status: OrderStatus
  summary: OrderSummary
  display_id: number
  total: number
  subtotal: number
  tax_total: number
  currency_code: string
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  version: number
  items: OrderItem[]
  payment_status: PaymentStatus
  fulfillment_status: FulfillmentStatus
  email: string
  region_id: string
  billing_address: Address | null
  shipping_address: Address | null
  shipping_methods: ShippingMethod[]
  payment_collections: PaymentCollection[]
  fulfillments: Fulfillment[]
  item_subtotal: number
  item_tax_total: number
  item_total: number
  discount_subtotal: number
  discount_tax_total: number
  discount_total: number
  shipping_subtotal: number
  shipping_tax_total: number
  shipping_total: number
  credit_line_subtotal: number
  credit_line_tax_total: number
  credit_line_total: number
  credit_lines: unknown[]
  original_item_subtotal: number
  original_item_tax_total: number
  original_item_total: number
  original_shipping_subtotal: number
  original_shipping_tax_total: number
  original_shipping_total: number
  original_tax_total: number
  original_total: number
}
