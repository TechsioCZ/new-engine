import Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"

export const createTestMedusaSdk = (): Medusa =>
  new Medusa({ baseUrl: "https://storefront.test" })

const rawZero = { value: 0 }
const TEST_TIMESTAMP = "2026-01-01T00:00:00.000Z"

const cartTotals = {
  credit_line_total: 0,
  discount_tax_total: 0,
  discount_total: 0,
  gift_card_tax_total: 0,
  gift_card_total: 0,
  item_subtotal: 0,
  item_tax_total: 0,
  item_total: 0,
  original_item_subtotal: 0,
  original_item_tax_total: 0,
  original_item_total: 0,
  original_shipping_subtotal: 0,
  original_shipping_tax_total: 0,
  original_shipping_total: 0,
  original_subtotal: 0,
  original_tax_total: 0,
  original_total: 0,
  raw_credit_line_total: rawZero,
  raw_discount_tax_total: rawZero,
  raw_discount_total: rawZero,
  raw_gift_card_tax_total: rawZero,
  raw_gift_card_total: rawZero,
  raw_item_subtotal: rawZero,
  raw_item_tax_total: rawZero,
  raw_item_total: rawZero,
  raw_original_item_subtotal: rawZero,
  raw_original_item_tax_total: rawZero,
  raw_original_item_total: rawZero,
  raw_original_shipping_subtotal: rawZero,
  raw_original_shipping_tax_total: rawZero,
  raw_original_shipping_total: rawZero,
  raw_original_subtotal: rawZero,
  raw_original_tax_total: rawZero,
  raw_original_total: rawZero,
  raw_shipping_subtotal: rawZero,
  raw_shipping_tax_total: rawZero,
  raw_shipping_total: rawZero,
  raw_subtotal: rawZero,
  raw_tax_total: rawZero,
  raw_total: rawZero,
  shipping_subtotal: 0,
  shipping_tax_total: 0,
  shipping_total: 0,
  subtotal: 0,
  tax_total: 0,
  total: 0,
}

export const createStoreCart = (
  id: string,
  overrides: Partial<HttpTypes.StoreCart> = {},
): HttpTypes.StoreCart => ({
  currency_code: "czk",
  id,
  promotions: [],
  ...cartTotals,
  ...overrides,
})

export const createStoreCartLineItem = (
  cart: HttpTypes.StoreCart,
  overrides: Partial<HttpTypes.StoreCartLineItem> = {},
): HttpTypes.StoreCartLineItem => ({
  cart,
  cart_id: cart.id,
  id: "item_1",
  is_discountable: true,
  is_tax_inclusive: false,
  quantity: 1,
  requires_shipping: true,
  title: "Test item",
  unit_price: 0,
  ...overrides,
})

export const createStoreCartShippingMethod = (
  cartId: string,
  overrides: Partial<HttpTypes.StoreCartShippingMethod> = {},
): HttpTypes.StoreCartShippingMethod => ({
  amount: 0,
  cart_id: cartId,
  created_at: TEST_TIMESTAMP,
  discount_tax_total: 0,
  discount_total: 0,
  id: "shipping_method_1",
  is_tax_inclusive: false,
  name: "Test shipping",
  original_subtotal: 0,
  original_tax_total: 0,
  original_total: 0,
  subtotal: 0,
  tax_total: 0,
  total: 0,
  updated_at: TEST_TIMESTAMP,
  ...overrides,
})

export const createStorePaymentSession = (
  providerId: string,
  overrides: Partial<HttpTypes.StorePaymentSession> = {},
): HttpTypes.StorePaymentSession => ({
  amount: 0,
  currency_code: "czk",
  data: {},
  id: `payment_session_${providerId}`,
  provider_id: providerId,
  status: "pending",
  ...overrides,
})

export const createSelectedStorePaymentSession = (
  providerId: string,
  isSelected: boolean,
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
  overrides: Partial<HttpTypes.StorePaymentCollection> = {},
): HttpTypes.StorePaymentCollection => ({
  amount: 0,
  currency_code: "czk",
  id: "payment_collection_1",
  payment_providers: [],
  status: "not_paid",
  ...overrides,
})

const orderTotals = {
  credit_line_total: 0,
  discount_tax_total: 0,
  discount_total: 0,
  gift_card_tax_total: 0,
  gift_card_total: 0,
  item_discount_total: 0,
  item_subtotal: 0,
  item_tax_total: 0,
  item_total: 0,
  original_item_subtotal: 0,
  original_item_tax_total: 0,
  original_item_total: 0,
  original_shipping_subtotal: 0,
  original_shipping_tax_total: 0,
  original_shipping_total: 0,
  original_subtotal: 0,
  original_tax_total: 0,
  original_total: 0,
  shipping_discount_total: 0,
  shipping_subtotal: 0,
  shipping_tax_total: 0,
  shipping_total: 0,
  subtotal: 0,
  tax_total: 0,
  total: 0,
}

export const createStoreCustomer = (
  id: string,
  overrides: Partial<HttpTypes.StoreCustomer> = {},
): HttpTypes.StoreCustomer => ({
  addresses: [],
  company_name: null,
  default_billing_address_id: null,
  default_shipping_address_id: null,
  email: "customer@example.com",
  first_name: null,
  id,
  last_name: null,
  ...overrides,
})

export const createStoreCustomerAddress = (
  id: string,
  overrides: Partial<HttpTypes.StoreCustomerAddress> = {},
): HttpTypes.StoreCustomerAddress => ({
  address_1: null,
  address_2: null,
  address_name: null,
  city: null,
  company: null,
  country_code: null,
  created_at: TEST_TIMESTAMP,
  customer_id: "customer_1",
  first_name: null,
  id,
  is_default_billing: false,
  is_default_shipping: false,
  last_name: null,
  metadata: null,
  phone: null,
  postal_code: null,
  province: null,
  updated_at: TEST_TIMESTAMP,
  ...overrides,
})

export const createStoreShippingOption = (
  id: string,
  overrides: Partial<HttpTypes.StoreCartShippingOption> = {},
): HttpTypes.StoreCartShippingOption => ({
  amount: 0,
  calculated_price: {
    calculated_amount: 0,
    calculated_price: {
      id: null,
      max_quantity: null,
      min_quantity: null,
      price_list_id: null,
      price_list_type: null,
    },
    currency_code: "czk",
    id: "calculated_price_1",
    original_amount: 0,
    original_amount_with_tax: 0,
    original_amount_without_tax: 0,
    original_price: {
      id: null,
      max_quantity: null,
      min_quantity: null,
      price_list_id: null,
      price_list_type: null,
    },
  },
  data: null,
  id,
  insufficient_inventory: false,
  name: "Test shipping",
  price_type: "flat",
  prices: [],
  provider: { id: "provider_1", is_enabled: true },
  provider_id: "provider_1",
  service_zone_id: "service_zone_1",
  shipping_profile_id: "shipping_profile_1",
  type: {
    code: "standard",
    description: "Standard shipping",
    id: "shipping_type_1",
    label: "Standard",
  },
  ...overrides,
})

export const createStoreShippingOptionWithServiceZone = (
  id: string,
): HttpTypes.StoreCartShippingOptionWithServiceZone => ({
  ...createStoreShippingOption(id),
  service_zone: {
    fulfillment_set: {
      id: "fulfillment_set_1",
      location: {
        address: {
          address_1: null,
          address_2: null,
          city: null,
          company: null,
          country_code: null,
          created_at: TEST_TIMESTAMP,
          deleted_at: null,
          id: "address_1",
          metadata: null,
          phone: null,
          postal_code: null,
          province: null,
          updated_at: TEST_TIMESTAMP,
        },
        id: "location_1",
      },
      type: "shipping",
    },
    fulfillment_set_id: "fulfillment_set_1",
    id: "service_zone_1",
  },
})

export const createStoreOrder = (
  id: string,
  overrides: Partial<HttpTypes.StoreOrder> = {},
): HttpTypes.StoreOrder => ({
  created_at: TEST_TIMESTAMP,
  currency_code: "czk",
  customer_id: null,
  email: null,
  fulfillment_status: "not_fulfilled",
  id,
  items: [],
  payment_status: "not_paid",
  region_id: "reg_1",
  sales_channel_id: null,
  shipping_methods: [],
  status: "pending",
  summary: {
    accounting_total: 0,
    current_order_total: 0,
    original_order_total: 0,
    paid_total: 0,
    pending_difference: 0,
    refunded_total: 0,
    transaction_total: 0,
  },
  updated_at: TEST_TIMESTAMP,
  ...orderTotals,
  ...overrides,
})
