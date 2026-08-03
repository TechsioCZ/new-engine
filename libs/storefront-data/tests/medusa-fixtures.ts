import Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"

export const createTestMedusaSdk = (): Medusa =>
  new Medusa({ baseUrl: "https://storefront.test" })

const rawZero = { value: 0 }

const cartTotals = {
  original_item_total: 0,
  original_item_subtotal: 0,
  original_item_tax_total: 0,
  item_total: 0,
  item_subtotal: 0,
  item_tax_total: 0,
  original_total: 0,
  original_subtotal: 0,
  original_tax_total: 0,
  total: 0,
  subtotal: 0,
  tax_total: 0,
  discount_total: 0,
  discount_tax_total: 0,
  gift_card_total: 0,
  gift_card_tax_total: 0,
  shipping_total: 0,
  shipping_subtotal: 0,
  shipping_tax_total: 0,
  original_shipping_total: 0,
  original_shipping_subtotal: 0,
  original_shipping_tax_total: 0,
  raw_original_item_total: rawZero,
  raw_original_item_subtotal: rawZero,
  raw_original_item_tax_total: rawZero,
  raw_item_total: rawZero,
  raw_item_subtotal: rawZero,
  raw_item_tax_total: rawZero,
  raw_original_total: rawZero,
  raw_original_subtotal: rawZero,
  raw_original_tax_total: rawZero,
  raw_total: rawZero,
  raw_subtotal: rawZero,
  raw_tax_total: rawZero,
  raw_discount_total: rawZero,
  raw_discount_tax_total: rawZero,
  raw_gift_card_total: rawZero,
  raw_gift_card_tax_total: rawZero,
  raw_shipping_total: rawZero,
  raw_shipping_subtotal: rawZero,
  raw_shipping_tax_total: rawZero,
  raw_original_shipping_total: rawZero,
  raw_original_shipping_subtotal: rawZero,
  raw_original_shipping_tax_total: rawZero,
  raw_credit_line_total: rawZero,
  credit_line_total: 0,
}

export const createStoreCart = (
  id: string,
  overrides: Partial<HttpTypes.StoreCart> = {}
): HttpTypes.StoreCart => ({
  id,
  currency_code: "czk",
  promotions: [],
  ...cartTotals,
  ...overrides,
})

export const createStoreCartLineItem = (
  cart: HttpTypes.StoreCart,
  overrides: Partial<HttpTypes.StoreCartLineItem> = {}
): HttpTypes.StoreCartLineItem => ({
  id: "item_1",
  title: "Test item",
  quantity: 1,
  requires_shipping: true,
  is_discountable: true,
  is_tax_inclusive: false,
  unit_price: 0,
  cart,
  cart_id: cart.id,
  ...overrides,
})

export const createStoreCartShippingMethod = (
  cartId: string,
  overrides: Partial<HttpTypes.StoreCartShippingMethod> = {}
): HttpTypes.StoreCartShippingMethod => ({
  id: "shipping_method_1",
  cart_id: cartId,
  name: "Test shipping",
  amount: 0,
  is_tax_inclusive: false,
  original_total: 0,
  original_subtotal: 0,
  original_tax_total: 0,
  total: 0,
  subtotal: 0,
  tax_total: 0,
  discount_total: 0,
  discount_tax_total: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
})

export const createStorePaymentSession = (
  providerId: string,
  overrides: Partial<HttpTypes.StorePaymentSession> = {}
): HttpTypes.StorePaymentSession => ({
  id: `payment_session_${providerId}`,
  amount: 0,
  currency_code: "czk",
  provider_id: providerId,
  data: {},
  status: "pending",
  ...overrides,
})

export const createSelectedStorePaymentSession = (
  providerId: string,
  isSelected: boolean
): HttpTypes.StorePaymentSession => {
  const session = createStorePaymentSession(providerId)
  Object.defineProperty(session, "is_selected", {
    configurable: true,
    enumerable: true,
    value: isSelected,
  })
  return session
}

export const createStorePaymentCollection = (
  overrides: Partial<HttpTypes.StorePaymentCollection> = {}
): HttpTypes.StorePaymentCollection => ({
  id: "payment_collection_1",
  currency_code: "czk",
  amount: 0,
  status: "not_paid",
  payment_providers: [],
  ...overrides,
})

const orderTotals = {
  original_item_total: 0,
  original_item_subtotal: 0,
  original_item_tax_total: 0,
  item_total: 0,
  item_subtotal: 0,
  item_tax_total: 0,
  item_discount_total: 0,
  original_total: 0,
  original_subtotal: 0,
  original_tax_total: 0,
  total: 0,
  subtotal: 0,
  tax_total: 0,
  discount_total: 0,
  discount_tax_total: 0,
  gift_card_total: 0,
  gift_card_tax_total: 0,
  shipping_total: 0,
  shipping_subtotal: 0,
  shipping_tax_total: 0,
  shipping_discount_total: 0,
  original_shipping_total: 0,
  original_shipping_subtotal: 0,
  original_shipping_tax_total: 0,
  credit_line_total: 0,
}

export const createStoreCustomer = (
  id: string,
  overrides: Partial<HttpTypes.StoreCustomer> = {}
): HttpTypes.StoreCustomer => ({
  id,
  email: "customer@example.com",
  default_billing_address_id: null,
  default_shipping_address_id: null,
  company_name: null,
  first_name: null,
  last_name: null,
  addresses: [],
  ...overrides,
})

export const createStoreCustomerAddress = (
  id: string,
  overrides: Partial<HttpTypes.StoreCustomerAddress> = {}
): HttpTypes.StoreCustomerAddress => ({
  id,
  address_name: null,
  is_default_shipping: false,
  is_default_billing: false,
  customer_id: "customer_1",
  company: null,
  first_name: null,
  last_name: null,
  address_1: null,
  address_2: null,
  city: null,
  country_code: null,
  province: null,
  postal_code: null,
  phone: null,
  metadata: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
})

export const createStoreShippingOptionWithServiceZone = (
  id: string
): HttpTypes.StoreCartShippingOptionWithServiceZone => ({
  ...createStoreShippingOption(id),
  service_zone: {
    id: "service_zone_1",
    fulfillment_set_id: "fulfillment_set_1",
    fulfillment_set: {
      id: "fulfillment_set_1",
      type: "shipping",
      location: {
        id: "location_1",
        address: {
          id: "address_1",
          company: null,
          address_1: null,
          address_2: null,
          city: null,
          country_code: null,
          province: null,
          postal_code: null,
          phone: null,
          metadata: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          deleted_at: null,
        },
      },
    },
  },
})

export const createStoreShippingOption = (
  id: string,
  overrides: Partial<HttpTypes.StoreCartShippingOption> = {}
): HttpTypes.StoreCartShippingOption => ({
  id,
  name: "Test shipping",
  price_type: "flat",
  service_zone_id: "service_zone_1",
  shipping_profile_id: "shipping_profile_1",
  provider_id: "provider_1",
  data: null,
  type: {
    id: "shipping_type_1",
    label: "Standard",
    description: "Standard shipping",
    code: "standard",
  },
  provider: { id: "provider_1", is_enabled: true },
  amount: 0,
  prices: [],
  calculated_price: {
    id: "calculated_price_1",
    calculated_amount: 0,
    original_amount: 0,
    original_amount_with_tax: 0,
    original_amount_without_tax: 0,
    currency_code: "czk",
    calculated_price: {
      id: null,
      price_list_id: null,
      price_list_type: null,
      min_quantity: null,
      max_quantity: null,
    },
    original_price: {
      id: null,
      price_list_id: null,
      price_list_type: null,
      min_quantity: null,
      max_quantity: null,
    },
  },
  insufficient_inventory: false,
  ...overrides,
})

export const createStoreOrder = (
  id: string,
  overrides: Partial<HttpTypes.StoreOrder> = {}
): HttpTypes.StoreOrder => ({
  id,
  region_id: "reg_1",
  customer_id: null,
  sales_channel_id: null,
  email: null,
  currency_code: "czk",
  status: "pending",
  items: [],
  shipping_methods: [],
  payment_status: "not_paid",
  fulfillment_status: "not_fulfilled",
  summary: {
    pending_difference: 0,
    current_order_total: 0,
    original_order_total: 0,
    transaction_total: 0,
    paid_total: 0,
    refunded_total: 0,
    accounting_total: 0,
  },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...orderTotals,
  ...overrides,
})
