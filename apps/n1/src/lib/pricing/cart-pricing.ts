import type { HttpTypes } from "@medusajs/types"
import { DEFAULT_CURRENCY } from "@/lib/constants"
import type { Cart, CartLineItem } from "@/types/cart"
import { formatAmount } from "@/utils/format/format-product"

type ShippingPriceMap = Record<string, number>

type ShippingOptionWithProvider = HttpTypes.StoreCartShippingOption & {
  provider?: {
    is_enabled?: boolean | null
  } | null
}

const getCurrencyCode = (currencyCode?: string | null) =>
  currencyCode ?? DEFAULT_CURRENCY

const isAmount = (amount?: number | null): amount is number =>
  typeof amount === "number" && Number.isFinite(amount)

const hasPositiveAmount = (amount?: number | null) =>
  typeof amount === "number" && amount > 0

const hasTaxLines = (lines?: unknown[] | null) => (lines?.length ?? 0) > 0

const getTaxRate = (lines?: { rate?: number | null }[] | null) =>
  lines?.reduce((sum, line) => sum + (line.rate ?? 0), 0) ?? 0

const getLineItemQuantity = (quantity?: number | null) =>
  typeof quantity === "number" && quantity > 0 ? quantity : 1

const getPerUnitAmount = (amount: number, quantity: number) =>
  Math.round(amount / quantity)

const getTaxInclusiveUnitAmount = (unitAmount: number, taxRate: number) =>
  Math.round(unitAmount * (1 + taxRate / 100))

const getItemsSubtotalAmount = (cart: Cart) =>
  cart.original_item_subtotal ?? cart.item_subtotal ?? cart.subtotal ?? 0

const getOrderItemsSubtotalAmount = (order: HttpTypes.StoreOrder) =>
  order.item_subtotal ?? 0

export const cartHasTaxData = (cart: Cart | null | undefined) => {
  if (!cart) {
    return false
  }

  return (
    hasPositiveAmount(cart.tax_total) ||
    hasPositiveAmount(cart.item_tax_total) ||
    hasPositiveAmount(cart.shipping_tax_total) ||
    cart.items?.some((item) => hasTaxLines(item.tax_lines)) === true ||
    cart.shipping_methods?.some((method) => hasTaxLines(method.tax_lines)) ===
      true
  )
}

export const getCartPriceView = (cart: Cart) => {
  const currencyCode = getCurrencyCode(cart.currency_code)
  const itemsSubtotalAmount = getItemsSubtotalAmount(cart)
  const shippingAmount = cart.shipping_total ?? 0
  const discountAmount = cart.discount_total ?? 0
  const taxAmount = cart.tax_total ?? 0
  const totalAmount = cart.total ?? 0

  return {
    itemsSubtotalAmount,
    shippingAmount,
    discountAmount,
    taxAmount,
    totalAmount,
    itemsSubtotal: formatAmount(itemsSubtotalAmount, true, currencyCode),
    shipping: formatAmount(shippingAmount, true, currencyCode),
    discount: formatAmount(discountAmount, true, currencyCode),
    tax: formatAmount(taxAmount, true, currencyCode),
    total: formatAmount(totalAmount, true, currencyCode),
    showTax: cartHasTaxData(cart),
    hasShipping: shippingAmount > 0,
  }
}

export const orderHasTaxData = (
  order: HttpTypes.StoreOrder | null | undefined
) => {
  if (!order) {
    return false
  }

  return (
    hasPositiveAmount(order.tax_total) ||
    hasPositiveAmount(order.item_tax_total) ||
    hasPositiveAmount(order.shipping_tax_total) ||
    order.items?.some((item) => hasTaxLines(item.tax_lines)) === true ||
    order.shipping_methods?.some((method) => hasTaxLines(method.tax_lines)) ===
      true
  )
}

export const getOrderPriceView = (order: HttpTypes.StoreOrder) => {
  const currencyCode = getCurrencyCode(order.currency_code)
  const itemsSubtotalAmount = getOrderItemsSubtotalAmount(order)
  const shippingAmount = order.shipping_total ?? 0
  const taxAmount =
    order.tax_total ??
    (order.item_tax_total ?? 0) + (order.shipping_tax_total ?? 0)
  const totalAmount = order.total ?? order.summary?.original_order_total ?? 0

  return {
    itemsSubtotalAmount,
    shippingAmount,
    taxAmount,
    totalAmount,
    itemsSubtotal: formatAmount(itemsSubtotalAmount, true, currencyCode),
    shipping: formatAmount(shippingAmount, true, currencyCode),
    tax: formatAmount(taxAmount, true, currencyCode),
    total: formatAmount(totalAmount, true, currencyCode),
    showTax: orderHasTaxData(order),
    hasShipping: shippingAmount > 0,
  }
}

export const formatCartLineItemUnitPrice = (
  item: CartLineItem,
  currencyCode?: string | null
) => {
  const quantity = getLineItemQuantity(item.quantity)
  const grossTotalAmount =
    item.total ?? item.item_total ?? item.original_total ?? null

  if (isAmount(grossTotalAmount)) {
    return formatAmount(
      getPerUnitAmount(grossTotalAmount, quantity),
      true,
      getCurrencyCode(currencyCode)
    )
  }

  const subtotalAmount =
    item.subtotal ?? item.item_subtotal ?? item.original_subtotal ?? null
  const taxAmount =
    item.tax_total ?? item.item_tax_total ?? item.original_tax_total ?? 0

  if (isAmount(subtotalAmount)) {
    return formatAmount(
      getPerUnitAmount(
        subtotalAmount + (isAmount(taxAmount) ? taxAmount : 0),
        quantity
      ),
      true,
      getCurrencyCode(currencyCode)
    )
  }

  if (isAmount(item.unit_price)) {
    const taxInclusiveUnitAmount = item.is_tax_inclusive
      ? item.unit_price
      : getTaxInclusiveUnitAmount(item.unit_price, getTaxRate(item.tax_lines))

    return formatAmount(
      taxInclusiveUnitAmount,
      true,
      getCurrencyCode(currencyCode)
    )
  }

  return formatAmount(0, true, getCurrencyCode(currencyCode))
}

export const getShippingOptionDisplayAmount = (
  option: HttpTypes.StoreCartShippingOption,
  shippingPrices?: ShippingPriceMap
) => {
  const amountFromHook = shippingPrices?.[option.id]
  if (typeof amountFromHook === "number") {
    return amountFromHook
  }

  const calculatedAmount = option.calculated_price?.calculated_amount
  if (typeof calculatedAmount === "number") {
    return calculatedAmount
  }

  return typeof option.amount === "number" ? option.amount : 0
}

export const formatShippingOptionDisplayPrice = (
  option: HttpTypes.StoreCartShippingOption,
  shippingPrices?: ShippingPriceMap
) => {
  const amount = getShippingOptionDisplayAmount(option, shippingPrices)
  if (amount <= 0) {
    return null
  }

  return formatAmount(
    amount,
    true,
    getCurrencyCode(option.calculated_price?.currency_code)
  )
}

export const isSelectableShippingOption = (
  option: HttpTypes.StoreCartShippingOption
) => (option as ShippingOptionWithProvider).provider?.is_enabled !== false

export const filterSelectableShippingOptions = (
  options?: HttpTypes.StoreCartShippingOption[]
) => options?.filter(isSelectableShippingOption) ?? []
